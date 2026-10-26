const fs=require('node:fs');
fs.mkdirSync('public',{recursive:true});
fs.copyFileSync('index.html','public/index.html');
for(const dir of ['css','js'])fs.cpSync(dir,'public/'+dir,{recursive:true});
console.log('Vercel 정적 파일 준비 완료');
