const htmlParser = require('node-html-parser')

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const getStockDetails = (stock) => {
    var row_parent = stock.parentNode.parentNode
    var object = Object();
    object['TRADING_CODE'] = stock.childNodes[0].rawText.trim()
    var attributes = ['LTP', 'HIGH', 'LOW', 'CLOSEP', 'YCP', 'CHANGE', 'TRADE', 'VALUE', 'VOLUME']

    var j = 0;
    for (var i = 5; i < row_parent.childNodes.length; i++) {
        if (row_parent.childNodes[i].childNodes.length > 0) {
            object[attributes[j++]] = row_parent.childNodes[i].childNodes[0].rawText.toString()
        }
    }

    return object
}

async function getCompanyList(callback) {
    try{
        const response = await fetch('https://www.dsebd.org/datafile/quotes.txt');

        if (!response.ok){
            throw new Error("Network response was not ok" + response.statusText);
        }

        const body = await response.text();
        const company_list = [];
        const parsed = body.split('\n');
        for (let i = 4; i < parsed.length - 1; i++){
            company_list.push({id: i - 3, name: parsed[i].split(' \t')[0].trim()})
        }

        callback(company_list)
    }
    catch(error){
        console.error('There has been a problem with your fetch operation:', error);
    }
}

async function getLatestStockPrice(callback) {
    try{
        const response = await fetch('https://www.dsebd.org/latest_share_price_scroll_l.php');
        if (!response.ok){
            throw new Error("Network response was not ok" + response.statusText);
        }

        const body = await response.text();
        
        let parsedStocks = {
            data: Date.now(),
            stocks: []
        }

        const root = htmlParser.parse(body);
        const stocks = root.querySelectorAll('.ab1');

        for (let i = 0; i < 360; i++) {
            parsedStocks.stocks.push(getStockDetails(stocks[i]));
        }

        callback(parsedStocks);

    }
    catch(error){
        console.error('Error occured', error);
    }
    
}


async function company_price_data(name, type, durationInput, callback) {
    try{
        let valid_durations = [1, 3, 6, 9, 12, 24];
        let valid_types = ['price', 'vol', 'trd'];

        const duration = durationInput.toString(); // Use a different variable name
        const response = await fetch(`https://www.dsebd.org/php_graph/monthly_graph.php?inst=${name}&duration=${duration}&type=${type}`);


        if (!response.ok){
            throw new Error("Network response was not ok" + response.statusText);
        }

        const body = await response.text();
        const findStr = "// CSV or path to a CSV file.";
        const endStr = "// options go here."
        const start_index = body.indexOf(findStr) + findStr.length
        const end_index = body.indexOf(endStr)

        if (start_index < 0 || end_index < 0 || start_index >= end_index) {
            return callback({ error: 'Failed to extract CSV data from response.' });
        }

        const csv_file = body.substr(start_index, end_index - start_index).trim().replace('{', "");
        const price_list = csv_file.split('+');
        const final_list = []

        for(var i = 1; i < price_list.length; i++){
            var values = price_list[i].replace("\"", "").trim().split('\\')[0].split(',');
            final_list.push({ date: values[0], data: values[1] });
        }

        callback(final_list);
    }
    catch(error){
        console.error("Error occurred: ", error);
    }
}


async function company_details(name,callback) {
    try{
        const response = await fetch('https://www.dsebd.org/displayCompany.php?name=' + name);
        if (!response.ok){
            throw new Error("Network response was not ok" + response.statusText);
        }
        
        const body = await response.text();
            const dom = new JSDOM(body);
            const tables = dom.window.document.querySelectorAll('#company')
            let market_info = new Object()
            const basic_info = new Object()

            const market_info_fields = ['LTP', 'CLOSEP', 'LASTUPDATE', 'DR', 'CA', 'DR', 'CP', 'YEARLYMR', 'OP', 'DV', 'AOP', 'DT', 'YCP', 'MC']
            const infos = tables[1].querySelectorAll('td');
            
            market_info['LTP'] = parseFloat(infos[0].textContent);
            for (var i = 0; i < infos.length; i++) {
                market_info[market_info_fields[i]] = infos[i].textContent.trim();
            }

            let basic_info_fields = ['AC', 'DTD', 'PC', 'TI', 'FACEPV', 'ML', 'TOS', 'Sector'];

            let basic = tables[2].querySelectorAll('td')
            for (var i = 0; i < basic_info_fields.length; i++) {
                basic_info[basic_info_fields[i]] = basic[i].textContent.trim()
            }
            callback({market_info, basic_info})
    }
    catch(error){
        console.log('Error occured,', error);
    }
    
}

module.exports = { getCompanyList, company_price_data, getLatestStockPrice, company_details } 
