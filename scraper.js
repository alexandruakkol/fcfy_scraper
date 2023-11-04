const puppeteer = require("puppeteer"),
    InitCompute = require("./compute"),
    scrapeLatest = require("./scrapeLatest"),
    scrapeHistory = require('./scrapeHistory'),
    {getPriceAtDate} = require('./histPrices.js');
const fs = require('fs');

global.appdata = { baseLink : 'https://www.wsj.com/market-data/quotes/'};

function structureData(data, checkIntegrity=false){
  function joinByYear(arr1,arr2,arr3,arr4,arr5,arr6){
    if(checkIntegrity){
      Array.from(arguments).forEach(arg=>{
        if(!arg || !Array.isArray(arg) || !Object.keys(arg).length) throw new Error ('Data integrity fail');
      });
      return;
    }
    let arrFin=[];
    arr1.map(arr1PerYr=>{
      let arr2SameYr = arr2.filter(arr2PerYr=>arr2PerYr.Year==arr1PerYr.Year)[0];
      let arr3SameYr = arr3.filter(arr3PerYr=>arr3PerYr.Year==arr1PerYr.Year)[0];
      let arr4SameYr = arr4.filter(arr4PerYr=>arr4PerYr.Year==arr1PerYr.Year)[0];
      let arr5SameYr = arr5.filter(arr5PerYr=>arr5PerYr.Year==arr1PerYr.Year)[0];
      let arr6SameYr = arr6.filter(arr6PerYr=>arr6PerYr.Year==arr1PerYr.Year)[0];
      arrFin.push({...arr1PerYr,...arr2SameYr,...arr3SameYr,...arr4SameYr,...arr5SameYr,...arr6SameYr, Currency:data.Currency, Denom:data.Denom, Price:data.Price, Symbol:data.Symbol, Sector:data.Sector, Timeframe:data.Timeframe, ScrapeDate:data.ScrapeDate});
    })
    return arrFin;
  }
  data = joinByYear(data['assetsData'], data['incomeSt'], data['liabsData'], data['operatingCF'], data['investingCF'], data['financingCF']);
  return data;
}

async function makeBrowser() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  return { page, browser };
}

makeBrowser().then(async (init) => {
  //mode logic
  let dataToScrape=[];

    let data = fs.readFileSync('./toScrape').toString().split('\n');
    let noSymbolsYetToPull = data.length;
    dataToScrape = data.map(sym => {return {symbol:sym, link:sym}});

  //start scraping
  for (SymbolCluster of dataToScrape) {
    const {symbol, link, Sector} = SymbolCluster;
    console.log(`${symbol} | ${((1-(noSymbolsYetToPull/data.length)) * 100).toFixed(2)}% done`)
    let tryCounter = 1, latest, allData;
    while (tryCounter < 3) {
      try {
        latest = await scrapeLatest(symbol, link, init.page);
        allData = await scrapeHistory(symbol, link, init.page);  //this returns scraped, unjoined data
        if(latest.error || allData.error) throw 'PageDown error'
        structureData(allData, true)  //check data integrity
        break;
      } catch(err) {
        tryCounter++;
        console.log(`--${symbol} scraping fail: try #${tryCounter}`);
        if (tryCounter == 3) {console.log(`--${symbol} total scraping fail`); allData = 'error'}
      } 
    }
    if (allData != "error" && latest !='error') {
        allData.symbol=symbol; allData.Sector = Sector;
        allData = structureData(allData, false);
        allData.push({...latest, symbol});
        allData = InitCompute(allData).then(async res=>{ // DB insert
            res = res.map(pc => {return {
                symbol:symbol,
                timeframe:pc.Timeframe,
                year:pc.Year,
                fcfy: pc.FreeCashFlowYield,
                fcf:pc.FreeCashFlow
        
            }});
            const result = res[res.length-1];
            const price0 = await getPriceAtDate(symbol, result.year);
            const price1 = await getPriceAtDate(symbol);

            if( !(price0 && price1) ) return console.log('Error: cannot get price at dates');
            
            const delta = price1/price0;
            console.log({
                symbol, 
                old_fcfy: convPct(result.fcfy),
                new_fcfy: convPct(result.fcfy * delta)
             })
          //if (res != "error") insertCluster(res, symbol)
        })
    } 
    noSymbolsYetToPull--;
  }
  init.browser.close();
});

function convPct(dec){
    return (dec*100).toFixed(2) + '%';
}