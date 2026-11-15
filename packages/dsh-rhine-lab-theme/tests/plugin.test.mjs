import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { prepareTheme } from '../lib/index.mjs';

test('first plugin boot installs and applies; later boots preserve user choices',()=>{
  const home=mkdtempSync(join(tmpdir(),'rhine-plugin-'));
  try{
    const target=join(home,'skins');
    const first=prepareTheme({target});assert.equal(first.activated,true);
    const statePath=join(home,'skin-center-active.json');
    const state={active:null,initialized:true,background:{enabled:false},future:'keep'};
    writeFileSync(statePath,JSON.stringify(state));
    assert.deepEqual(prepareTheme({target}),{installed:false,activated:false});
    assert.deepEqual(JSON.parse(readFileSync(statePath,'utf8')),state);
    const update=join(home,'update');cpSync(resolve('skins/rhine-lab'),update,{recursive:true});
    writeFileSync(join(update,'skin.css'),readFileSync(join(update,'skin.css'),'utf8')+'\n/* updated */');
    const changed=prepareTheme({target,source:update});assert.equal(changed.installed,true);assert.equal(changed.activated,false);
    assert.deepEqual(JSON.parse(readFileSync(statePath,'utf8')),state);assert.ok(existsSync(changed.backup));
  }finally{rmSync(home,{recursive:true,force:true});}
});

test('an updated package never overwrites a locally edited skin',()=>{
  const home=mkdtempSync(join(tmpdir(),'rhine-plugin-keep-'));
  try{
    const target=join(home,'skins');
    prepareTheme({target});
    const installed=join(target,'rhine-lab','skin.css');
    writeFileSync(installed,readFileSync(installed,'utf8')+'\n/* local edit */');
    const update=join(home,'update');
    cpSync(resolve('skins/rhine-lab'),update,{recursive:true});
    writeFileSync(join(update,'skin.css'),readFileSync(join(update,'skin.css'),'utf8')+'\n/* packaged update */');
    const result=prepareTheme({target,source:update});
    assert.equal(result.installed,false);
    assert.deepEqual(result.kept,['rhine-lab']);
    const kept=readFileSync(installed,'utf8');
    assert.match(kept,/local edit/);
    assert.doesNotMatch(kept,/packaged update/);
  }finally{rmSync(home,{recursive:true,force:true});}
});

test('corrupt plugin marker is moved aside and the install still runs',()=>{
  const home=mkdtempSync(join(tmpdir(),'rhine-plugin-invalid-'));
  try{
    writeFileSync(join(home,'rhine-lab-plugin.json'),'[]');
    const result=prepareTheme({target:join(home,'skins')});
    assert.equal(result.installed,true);
    assert.equal(result.activated,true);
    const aside=readdirSync(home).filter(name=>name.startsWith('rhine-lab-plugin.json.corrupt-'));
    assert.equal(aside.length,1,'the unreadable marker is preserved for inspection');
    const marker=JSON.parse(readFileSync(join(home,'rhine-lab-plugin.json'),'utf8'));
    assert.equal(typeof marker.version,'string');
    assert.ok(marker.skins['rhine-lab']);
  }finally{rmSync(home,{recursive:true,force:true});}
});
