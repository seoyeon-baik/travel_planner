function redact(value) {
  let text=String(value || '');
  const connection=process.env.DATABASE_URL;
  if(connection){
    text=text.split(connection).join('[DATABASE_URL]');
    try{const u=new URL(connection);for(const secret of [u.password,decodeURIComponent(u.password)])if(secret)text=text.split(secret).join('[REDACTED]');}catch{}
  }
  return text.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi,'[DATABASE_URL]').replace(/npg_[a-zA-Z0-9]+/g,'[REDACTED]').slice(0,700);
}
function errorDetails(error){
 return {name:redact(error.name),code:redact(error.code || 'UNKNOWN'),message:redact(error.message),routine:redact(error.routine)||null,cause:error.cause?{code:redact(error.cause.code||'UNKNOWN'),message:redact(error.cause.message)}:undefined};
}
module.exports={errorDetails};
