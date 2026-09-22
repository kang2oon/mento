const fs = require('fs');
fetch('https://docs.google.com/spreadsheets/d/1O0KxN9N8Z6Q2m3vE2UfJ9M4W5P8l8s2B/gviz/tq?tqx=out:json&sheet=ActivityLogs&headers=1').then(r => r.text()).then(text => {
    const obj = JSON.parse(text.substring(47, text.length - 2));
    console.log(JSON.stringify(obj.table.rows[0], null, 2));
}).catch(console.error);
