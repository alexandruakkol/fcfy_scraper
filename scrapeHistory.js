async function scrapeHistory(Symbol, Link, page) {
  let balanceSheetURL = global.appdata.baseLink + Link + `/financials/annual/balance-sheet`,
  incomeStatementURL = global.appdata.baseLink + Link + `/financials/annual/income-statement`,
  cashflowStatementURL = global.appdata.baseLink + Link + `/financials/annual/cash-flow`;
  try {
    ////////Balance sheet\\\\\\\
    //TODO: make headers global
    await page.setExtraHTTPHeaders({   
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
      'content-type': 'text/plain;charset=UTF-8',
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
    })
    await page.goto(
      balanceSheetURL,
      { waitUntil: "domcontentloaded" },
      { timeout: 0 }
    );
      
    const balanceSheet = await page.evaluate(() => {
      //scrape elements
      const error = document.querySelector("#cr_cashflow > span");
      if (error) return { error: "pageDown" };
      const meta = document.querySelector(".fiscalYr").textContent.split(" ");
      const Price = document.querySelector("#quote_val").textContent;
      const assetsTable = document.querySelector("#cr_cashflow > div.expanded > div.cr_cashflow_table > table");
      const liabsTable = document.querySelector("#cr_cashflow > div.collapsed > div.cr_cashflow_table > table");
      
      //html table to json time series
      function table2data(tableEl){
        let data=[], columns=[], formattedData=[];
        Array.prototype.forEach.call(tableEl.tHead.childNodes[1].childNodes,(th)=>{
          if(th.textContent.startsWith('20'))columns.push(th.textContent);
        })
        Array.prototype.forEach.call(tableEl.childNodes[3].childNodes,tr=>{
          if (tr.className != "hide" && tr.nodeName != "#text") {
            let internalIdx=-2;
            Array.prototype.forEach.call(tr.childNodes,(financial,idx)=>{
              if(idx>11)return; let value = financial.textContent;
              if (value.includes("%"))value = value.replace("%", "") / 100;
              else {
                if (Array.from(value)[0] == "(")
                  value = value.replace(",", "").replace("(", "").replace(")", "") * -1;
                else value = value.replace(",", "") * 1;
              }
              if(financial.nodeName != "#text"){
                let Year = columns[internalIdx+idx];
                data[Year]={...data[Year],...{[tr.childNodes[1].textContent.replace(/[" !"#$%&'()*+,-./:;<=>?@^_`{|}~"]/g,'').replaceAll('/','Sl')]:value}}
                internalIdx--;
              }
            });
          }
        })
        Object.keys(data).map(yr=>{
          if(yr == 'undefined')return;
          formattedData.push({...data[yr],...{Year:yr}})
        })
        return formattedData;
      }

      const Currency = meta[meta.length - 2], Denom = meta[meta.length - 1].replace(".", "");
      let assetsData=table2data(assetsTable);
      let liabsData=table2data(liabsTable)

      return {assetsData, liabsData, Currency, Denom, Price, ScrapeDate: new Date().toLocaleDateString("en-US"), Timeframe:'A'}
  });
    ////////end balance sheet\\\\\\\

    if (balanceSheet.error) {
      console.log(Symbol, balanceSheet.error);
      return "error";
    }
    //////IncomeStatement\\\\\\\\\\\\

    await page.goto(
      incomeStatementURL,
      { waitUntil: "domcontentloaded" },
      { timeout: 0 }
    );

    const incomeStatement = await page.evaluate(() => {
      //scrape elements
      const error = document.querySelector("#cr_cashflow > span");
      if (error) return { error: "pageDown" };
      const incomeTable = document.querySelector("#cr_cashflow > div.expanded > div > table")
      
      //html table to json time series
      function table2data(tableEl){
        let data=[], columns=[], formattedData=[];
        Array.prototype.forEach.call(tableEl.tHead.childNodes[1].childNodes,(th)=>{
          if(th.textContent.startsWith('20'))columns.push(th.textContent);
        })
        Array.prototype.forEach.call(tableEl.childNodes[3].childNodes,tr=>{
          if (tr.className != "hide" && tr.nodeName != "#text") {
            let internalIdx=-2;
            Array.prototype.forEach.call(tr.childNodes,(financial,idx)=>{
              if(idx>11)return; let value = financial.textContent;
              if (value.includes("%"))value = value.replace("%", "") / 100;
              else {
                if (Array.from(value)[0] == "(")
                  value = value.replace(",", "").replace("(", "").replace(")", "") * -1;
                else value = value.replace(",", "") * 1;
              }
              if(financial.nodeName != "#text"){
                let Year = columns[internalIdx+idx];
                data[Year]={...data[Year],...{[tr.childNodes[1].textContent.replace(/[" !"#$%&'()*+,-./:;<=>?@^_`{|}~"]/g,'').replaceAll('/','Sl')]:value}}
                internalIdx--;
              }
            });
          }
        })
        Object.keys(data).map(yr=>{
          if(yr == 'undefined')return;
          formattedData.push({...data[yr],...{Year:yr}})
        })
        return formattedData;
      }

      let incomeSt=table2data(incomeTable);

      return {incomeSt};
    });

    //////Cashflow\\\\\\\\\\\\

    await page.goto(
      cashflowStatementURL,
      { waitUntil: "domcontentloaded" },
      { timeout: 0 }
    );
    const cashflowStatement = await page.evaluate(() => {
      //scrape elements
      const error = document.querySelector("#cr_cashflow > span");
      if (error) return { error: "pageDown" };
      const operatingCFTable = document.querySelector("#cr_cashflow > div.expanded > div.cr_cashflow_table > table");
      const investingCFTable = document.querySelector("#cr_cashflow > div:nth-child(3) > div.cr_cashflow_table > table");
      const financingCFTable = document.querySelector("#cr_cashflow > div:nth-child(4) > div.cr_cashflow_table > table");

      //html table to json time series
      function table2data(tableEl){
        let data=[], columns=[], formattedData=[];
        Array.prototype.forEach.call(tableEl.tHead.childNodes[1].childNodes,(th)=>{
          if(th.textContent.startsWith('20'))columns.push(th.textContent);
        })
        Array.prototype.forEach.call(tableEl.childNodes[3].childNodes,tr=>{
          if (tr.className != "hide" && tr.nodeName != "#text") {
            let internalIdx=-2;
            Array.prototype.forEach.call(tr.childNodes,(financial,idx)=>{
              if(idx>11)return; let value = financial.textContent;
              if (value.includes("%"))value = value.replace("%", "") / 100;
              else {
                if (Array.from(value)[0] == "(")
                  value = value.replace(",", "").replace("(", "").replace(")", "") * -1;
                else value = value.replace(",", "") * 1;
              }
              if(financial.nodeName != "#text"){
                let Year = columns[internalIdx+idx];
                data[Year]={...data[Year],...{[tr.childNodes[1].textContent.replace(/[" !"#$%&'()*+,-./:;<=>?@^_`{|}~"]/g,'').replaceAll('/','Sl')]:value}}
                internalIdx--;
              }
            });
          }
        })
        Object.keys(data).map(yr=>{
          if(yr == 'undefined')return;
          formattedData.push({...data[yr],...{Year:yr}})
        })
        return formattedData;
      }

      let operatingCF=table2data(operatingCFTable);
      let investingCF=table2data(investingCFTable);
      let financingCF=table2data(financingCFTable);

      return {operatingCF, investingCF, financingCF};
    });

    if (cashflowStatement.error) {
      console.log(Symbol, cashflowStatement.error);
      return "error";
    }

    ////////end income statement\\\\\\\

    return {
      ...balanceSheet,
      ...incomeStatement,
      ...cashflowStatement
    };

  } catch (error) {
      console.log(`-- try #${failCounter}`, Symbol, error);
    }
}

module.exports = scrapeHistory ;