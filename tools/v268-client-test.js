'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function between(a,b){const start=html.indexOf(a),end=html.indexOf(b,start);assert(start>=0&&end>start);return html.slice(start,end);}
const ctx={COSMETIC_SHOP_ITEMS:[],BUILT_IN_COSMETICS:[],EARNED_AVATARS:[],EARNED_FRAMES:[],LEVEL_REWARDS:[],equippedCosmetics:{tableTheme:'table-neon'}};
vm.createContext(ctx);
vm.runInContext(between('    const TABLE_ART =','    // Seasonal event pictures')+between('    const SEASONAL_TABLE_ART =','    const SEASONAL_BACK_ART =')+between('    function homeBackdropTableId()','    function homeBackdropCss(id)')+between('    function bigPreviewItem(','    function bigPreviewStatus('),ctx);
assert.equal(ctx.homeBackdropTableId(),'table-neon');ctx.equippedCosmetics.tableTheme='default';assert.equal(ctx.homeBackdropTableId(),'default');
assert.equal(ctx.bigPreviewItem('default'),null,'untyped defaults cannot resolve to a random category');
const back=ctx.bigPreviewItem('default','cardBack');assert.equal(back.category,'Card Backs');assert.equal(back.name,'Default Card Back');assert(back.builtIn);assert.equal(ctx.bigPreviewItem('default','frame'),null);
const sources=vm.runInContext('Object.values(TABLE_ART).concat(Object.values(SEASONAL_TABLE_ART))',ctx);
function jpegDimensions(b){let i=2;assert.equal(b.readUInt16BE(0),0xffd8);while(i<b.length){assert.equal(b[i++],0xff);while(b[i]===0xff)i++;const m=b[i++];if(m===0xd9||m===0xda)break;const len=b.readUInt16BE(i);if([0xc0,0xc1,0xc2].includes(m))return [b.readUInt16BE(i+5),b.readUInt16BE(i+3)];i+=len;}throw Error('JPEG dimensions missing');}
for(const src of sources){const b=fs.readFileSync(path.join(root,src));if(src.endsWith('.svg')){const s=b.toString();assert(/<svg[^>]*viewBox=/.test(s),src);assert(s.includes('preserveAspectRatio="xMidYMid slice"'),src);assert(!/<image\b/i.test(s),`${src}: resolution-independent vector scene`);}else{const [w,h]=jpegDimensions(b);assert(w>=1920&&h>=1920,`${src}: seamless tile has 3x density at 640 CSS pixels`);}}
const refresh=between('    function refreshHomeBackdrop()','    // Tablets/PCs zoom');assert(!refresh.includes("backgroundSize = look.size ?"),'never reset cover to intrinsic auto');
const hold=between('    (function wireBigPreviewHold()','    // Decks are the deck theme');assert(!hold.includes("id === 'default'"),'default backs may be held');assert(hold.includes('openBigPreview(id, type)'),'hold resolves the actual category');
console.log(`PASS v268: ${sources.length} sharp vector/tiled table sources, equipped home selection, category-safe default preview and hold routing.`);
