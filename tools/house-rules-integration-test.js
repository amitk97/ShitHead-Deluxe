'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const checks=[
 ['modules loaded',html.includes('js/house-rules.js')&&html.includes('js/house-rules-bots.js')],
 ['default standard',html.includes("ruleMode: 'standard'")],
 ['house challenge gate',html.includes("if (state.ruleMode === 'house') return;")],
 ['house win reward gate',html.includes("return Promise.resolve({houseRules:true,diamondsAwarded:0})")],
 ['joker off deck filter',html.includes("state.houseRules?.joker === 'off'")],
 ['three bot house limit',html.includes("state.ruleMode === 'house' ? 3 : 2")],
 ['all humans ready',html.includes("Everyone must review the House Rules and press Ready.")],
 ['dynamic bot scorer',html.includes('ShHouseRulesBots.score')],
 ['guide section',html.includes('data-guide-section="house-rules"')],
 ['house tag',html.includes('HOUSE RULES')]
];
for(const [name,ok] of checks)assert(ok,name);
console.log('house-rules integration: '+checks.length+' guards passed');