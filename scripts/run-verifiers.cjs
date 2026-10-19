const {spawnSync}=require('node:child_process');
for(const script of ['verify-tools.cjs','verify-shizhi.cjs','verify-trend.cjs','verify-site.cjs']){
 const result=spawnSync(process.execPath,['scripts/'+script],{encoding:'utf8',timeout:240000});
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
 if(result.status!==0){const detail=((result.stderr||'')+(result.stdout||'')+(result.error?.message||'')).slice(-10000).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');console.log('::error title='+script+'::'+detail);process.exit(1);}
}
