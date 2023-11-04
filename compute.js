const {getHistPrice, getPriceAtDate} = require('./histPrices');
async function InitCompute(allData) {
  let result=[];

  let years = allData.map(function(o) { if(!o.Year.includes('-')) return o.Year*1 });
  years = years.filter(y=>typeof y != 'undefined');
  let maxYear = Math.max.apply(Math,years)
  try{
    return await runCompute(allData, maxYear)
  } catch (err) {console.log('compute error', err); return 'error'}

  async function runCompute(allData, maxYear){
    for(data of allData){
      let isAnnual = false;
      if(data.Timeframe=='A')isAnnual=true;
      if((data.Year != maxYear) && isAnnual){
        data['Price'] = await getHistPrice(data.symbol, data.Year)  //pull historical prices for calulation
      }
      let acc = compute(data, isAnnual);
      result.push(acc);
    }
    return result;
  }

  function compute(data, isAnnual){
    let Mcap = null,
      Ncavpsppct = null,
      Ncavpsppct_fixed = null,
      Roepct = null,
      Pe = null,
      Roce = null,
      Depct = null,
      InterestRatepct = null;

    const currentAssets = data["TotalCurrentAssets"],
      totalLiabilities = data["TotalLiabilities"],
      currentLiabilities = data["TotalCurrentLiabilities"],
      totalAssets = data["TotalAssets"],
      shares = data["DilutedSharesOutstanding"],
      price = data["Price"],
      netIncome = isAnnual ? data["NetIncome"] : data["NetIncome"]*4,
      totalStockEquity = data[`TotalShareholdersEquity`],
      ebitda = data["EBITDA"],
      interestExpense = isAnnual ? data["InterestExpense"] : data["InterestExpense"]*4,
      longTermDebt = data["LongTermDebt"],
      DA = data["DepreciationAmortizationExpense"];

    //Ncavpsppct
    if (currentAssets && totalLiabilities && shares && price) {
      Ncavpsppct = ((currentAssets - totalLiabilities) / shares / price).toFixed(2)*1;
    }

    //Ncavpsppct_fixed (includes fixed assets, adjusted)
    if (currentAssets && totalAssets && totalLiabilities && shares && price) {
      const ltAssets = totalAssets - currentAssets;
      const adjAssets = currentAssets + 0.33 * ltAssets;
      Ncavpsppct_fixed = ( (adjAssets - totalLiabilities) / shares / price).toFixed(2)*1;
    }

    //Mcap
    if (price && shares) {
      Mcap = (price * shares).toFixed(0)*1;
    }

    //Roepct
    if (totalStockEquity && netIncome) {
      Roepct = (netIncome / totalStockEquity).toFixed(2)*1;
    }

    //pe
    if (Mcap && netIncome) {
      Pe = (Mcap / netIncome).toFixed(2)*1;
    }

    //de (procentual)
    if (longTermDebt && totalStockEquity) {
      Depct = (longTermDebt / totalStockEquity).toFixed(2)*1;
    }

    //InterestRatepct
    if (interestExpense && longTermDebt) {
      InterestRatepct = (interestExpense / longTermDebt).toFixed(2)*1;
    }

    //roce
    if (totalAssets && currentLiabilities) {
      let ebit = isAnnual ? (ebitda - DA) : (ebitda - DA)*4
      Roce = (ebit / (totalAssets - currentLiabilities)).toFixed(2)*1;
    }
    return{
      ...data,
      Mcap,
      Ncavpsppct,
      Ncavpsppct_fixed,
      Roepct,
      Roce,
      Pe,
      Depct,
      InterestRatepct,
    };
  }
}

module.exports = InitCompute;
