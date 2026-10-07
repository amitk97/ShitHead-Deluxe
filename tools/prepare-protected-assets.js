'use strict';
// Only CI has the deployment private key. Never print it or the unwrapped asset key.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
for (const [source,target] of [['keepsake.enc.json','keepsake.png'],...['portrait','wide','tall','square'].map(v=>['table-'+v+'.enc.json','table-'+v+'.webp'])]) {
const envelope=JSON.parse(fs.readFileSync(path.join(__dirname,'../functions/private-assets',source),'utf8'));
const credential=JSON.parse(process.env.DEPLOY_CREDENTIAL);
const key=crypto.privateDecrypt({key:credential.private_key,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(envelope.wrappedKey,'base64'));
const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
const plaintext=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]);
if(crypto.createHash('sha256').update(plaintext).digest('hex')!==envelope.sha256)throw new Error('Protected asset checksum mismatch');
fs.writeFileSync(path.join(__dirname,'../functions/private-assets',target),plaintext);
}
console.log('Protected assets prepared and checksums verified.');
