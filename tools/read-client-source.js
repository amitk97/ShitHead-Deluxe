'use strict';
// Static source tests inspect HTML and its local script/style dependencies.
const fs = require('node:fs');
const path = require('node:path');
module.exports = function readClientSource(file) {
  const root = path.dirname(file);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<script\b([^>]*?)\bsrc="([^"]+)"([^>]*)>\s*<\/script>/g, (tag, before, src, after) => {
    if (/^(?:https?:)?\/\//.test(src)) return tag;
    const code = fs.readFileSync(path.resolve(root, src.split('?')[0].replace(/^\//, '')), 'utf8');
    return tag + '\n<script>' + code + '</script>';
  });
  return html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (tag, href) => {
    if (/^(?:https?:)?\/\//.test(href)) return tag;
    const css = fs.readFileSync(path.resolve(root, href.split('?')[0].replace(/^\//, '')), 'utf8');
    return tag + '\n<style>' + css + '</style>';
  });
};
