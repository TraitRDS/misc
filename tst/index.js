var superagent = require('superagent'); 
var cheerio = require('cheerio');
var async = require('async');
var mkdirp = require('mkdirp');
var fs = require('fs');

var baseUrl = 'https://training.typesafe.com';
var baseFolder = 'output';
var credential = 'PLAY_SESSION=e3f155e131cb39cce0aa45ab59bac4ed0799ec21-username=webdav1';


console.log("Starting...");

var docs = [];
async.mapLimit(["/!archive/as-v2"], 1, (link, callback) => {
    getLinkInfos(link, callback);
}, (err, result) => {
    console.log("Get all docs of " + result + " finished. " + docs.length + " docs are found.");
    
    async.mapLimit(docs, 3, (doc, callback) => {
        console.log(doc + " downloading...");
        var file = fs.createWriteStream(baseFolder + doc);
        var req = superagent.get(baseUrl + doc).set('Cookie', credential);
        req.pipe(file);
        req.on("end", () => {
            console.log(doc + " downloaded.")
            callback(null, doc);
        })
    }, (err, res) => {
        console.log("All " + res.length + " files download finished.");
    });
});

function getLinkInfos(href, end) {
    console.log("Creating directory " + href);  
    mkdirp(baseFolder + href, function(err) {
        if (err) {
            console.log("Create directory error: " + err);
        }
    });

    superagent.get(baseUrl + href).set('Cookie', credential)
    .end(function(err, res) {
        var $ = cheerio.load(res.text);
        var results = $(".course-item a[href]:not(:contains('..'), :contains('archive'), :empty)");

        var docsFilter = ":contains('.zip'), :contains('.html'), :contains('.md'), :contains('.markdown'), :contains('.pdf'), :contains('.drawing'), :contains('.key'), :contains('.name'), :contains('.xml'), :contains('.iml')";
        

        results.filter(docsFilter).each(function(idx, ele){
            docs.push($(ele).attr('href'));
        });
        
        
        var links = [];
        results.filter(":not(" + docsFilter + ")").each(function(idx, ele){
            links.push($(ele).attr('href'));
        });
        async.mapLimit(links, 3, (link, callback) => {
            getLinkInfos(link, callback);
        }, (err, result) => {
            console.log(href + " scan finished.");
            end(null, href);
        });
    })
}
