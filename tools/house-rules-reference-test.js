'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
[
 ['dynamic Card Powers',html.includes('function activeCardReference()')&&html.includes('activeCardReference().forEach')],
 ['dynamic Play Matrix',html.includes('function houseMatrixLegal(')&&html.includes('const matrixRanks = activeReferenceRanks()')],
 ['Joker Off removed from references',html.includes("state.houseRules?.joker === 'off' ? [] : ['JOKER']")],
 ['dynamic pile description',html.includes('function activePilePowerLabel(')&&html.includes('activePilePowerLabel(topCardRank)')],
 ['standard reference preserved',html.includes("if (!isHouseRulesMatch()) return CARD_REFERENCE;")],
 ['standard matrix preserved',html.includes("isHouseRulesMatch() ? houseMatrixLegal(row, col) : !!PLAY_MATRIX[row]?.[colIndex]")]
].forEach(([name,ok])=>assert(ok,name));
console.log('house-rules live reference: 6 guards passed');