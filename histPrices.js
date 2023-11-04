const yahooFinance = require('yahoo-finance');

const monthAbbreviations = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

async function getHistPrice(symbol, atEndOfYear){ 
    let from = atEndOfYear + '-11-01', to = atEndOfYear + '-12-31';
    try{
        const res = await yahooFinance.historical({symbol:symbol, from:from, to:to})
        return res[0].close
    } catch(err) {
        null;
    }
}

async function getPriceAtDate(symbol, date=null){

    const present = !date;

    if(!date) date = (new Date()).toISOString().split('T')[0];
    const dateArr = date.split('-');

    if(!present) {
        let monthNo = monthAbbreviations.indexOf(dateArr[1]);
        if(String(monthNo).length === 1) monthNo = '0'+monthNo;
        date = dateArr[2] + '-' + monthNo + '-' + dateArr[0];
    }

    const to = date;
    date = (new Date(Date.parse(date) - 259_200_000)).toISOString().split('T')[0]; //subtract 3 days

    try{
        const res = await yahooFinance.historical({symbol:symbol, from:date, to:to});
        return res[0].close;
    } catch(err) {
        null;
    }
}
module.exports = {getHistPrice, getPriceAtDate}