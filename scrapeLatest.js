async function scrapeLatest(Symbol, Link, page) {

  let balanceSheetURL = global.appdata.baseLink + Link + '/financials/quarter/balance-sheet/';
  let incomeStatementURL = global.appdata.baseLink + Link + `/financials/quarter/income-statement`;
  let cashflowStatementURL = global.appdata.baseLink + Link + `/financials/quarter/cash-flow`;

  try {
    ////////Balance sheet\\\\\\\\
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
        const error = document.querySelector("#cr_cashflow > span");
        if (error) return { error: "pageDown" };
        const meta = document.querySelector(".fiscalYr").textContent.split(" ");
        const currency = meta[meta.length - 2],
            denom = meta[meta.length - 1].replace(".", "");
        const Year = document.querySelector("#cr_cashflow > div.expanded > div.cr_cashflow_table > table > thead > tr > th:nth-child(2)").textContent;
        const price = document.querySelector("#quote_val").textContent;
        const assetsRoot = document.querySelector("#cr_cashflow > div.expanded > div.cr_cashflow_table > table > tbody");
        const liabsRoot = document.querySelector("#cr_cashflow > div.collapsed > div.cr_cashflow_table > table > tbody");

        function extractData(root){
            let obj={};
            Array.prototype.forEach.call(root.childNodes, (financial) => {
                if (financial.className != "hide" && financial.nodeName != "#text") {
                let key = financial.childNodes[1].textContent.replace(/[" !"#$%&'()*+,-./:;<=>?@^_`{|}~"]/g,'')
                let value = financial.childNodes[3].textContent;
                if (value.includes("%"))
                    obj[key] = value = value.replace("%", "") / 100;
                else obj[key] = value.replace(",", "") * 1;
                }
            });
            return obj;
        }

        let assets=extractData(assetsRoot);
        let liabs=extractData(liabsRoot);

        let extra = {};
        extra["Price"] = price * 1;
        extra["Denom"] = denom;
        extra["Currency"] = currency;
        extra["Year"] = Year;
        extra['Timeframe']='Q';

        return {...assets,...liabs,...extra};
    });

    if (balanceSheet.error) {
      console.log(Symbol, balanceSheet.error);
      return "error";
    }
    ////////IncomeStatement\\\\\\\\\\\\

    await page.goto(
      incomeStatementURL,
      { waitUntil: "domcontentloaded" },
      { timeout: 0 }
    );
    const incomeStatement = await page.evaluate(() => {
      let obj = {};

      const root = document.querySelector("#cr_cashflow > div.expanded > div.cr_cashflow_table > table > tbody");
      Array.prototype.forEach.call(root.childNodes, (financial) => {
        if (financial.className != "hide" && financial.nodeName != "#text") {
          let key = financial.childNodes[1].textContent.replace(/[" !"#$%&'()*+,-./:;<=>?@^_`{|}~"]/g,'')
          let value = financial.childNodes[3].textContent;
          if (value.includes("%")) obj[key] = value = value.replace("%", "") / 100;
            else {
              if (Array.from(value)[0] == "(")
                obj[key] = value.replace(",", "").replace("(", "").replace(")", "") * -1;
              else obj[key] = value.replace(",", "") * 1;
            }
        }
      });

      return obj;
    });

    ////////Cashflow statement\\\\\\\\\\\\

    await page.goto(
        cashflowStatementURL,
        { waitUntil: "domcontentloaded" },
        { timeout: 0 }
      );
      const cashflowStatement = await page.evaluate(() => {
          
        const operatingCFTable = document.querySelector("#cr_cashflow > div.expanded > div.cr_cashflow_table > table > tbody");
        const investingCFTable = document.querySelector("#cr_cashflow > div:nth-child(3) > div.cr_cashflow_table > table > tbody");
        const financingCFTable = document.querySelector("#cr_cashflow > div:nth-child(4) > div.cr_cashflow_table > table > tbody");
    
        function extractData(root){
        let obj = {};
        Array.prototype.forEach.call(root.childNodes, (financial) => {
            if (financial.className != "hide" && financial.nodeName != "#text") {
            let key = financial.childNodes[1].textContent.replace(/[" !"#$%&'()*+,-./:;<=>?@^_`{|}~"]/g,'')
            let value = financial.childNodes[3].textContent;
            if (value.includes("%")) {
                obj[key] = value = value.replace("%", "") / 100;
            } else {
                if (Array.from(value)[0] == "(")
                obj[key] =
                    value.replace(",", "").replace("(", "").replace(")", "") * -1;
                else obj[key] = value.replace(",", "") * 1;
            }
            }
        });
        return obj;
        }
        
        const operatingCF = extractData(operatingCFTable);
        const investingCF = extractData(investingCFTable);
        const financingCF = extractData(financingCFTable);

        return {...operatingCF, ...investingCF, ...financingCF};
      });

    return {
      ...balanceSheet,
      ...incomeStatement,
      ...cashflowStatement,
      ...{ ScrapeDate: new Date().toLocaleDateString("en-US") },
    };
  } catch (error) {
    console.log(`-- try #${failCounter}`, Symbol, error);
  }
}

module.exports = scrapeLatest ;