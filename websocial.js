function chdisplay(old,newview)
{
  if(old){document.getElementById(old).style.display='none';}
  if(newview){document.getElementById(newview).style.display='block';}
}

function initgui()
{
  var key=document.getElementById('privkey').value;
  init(key);
  chdisplay('login_window',false);
  if(key=='')
  {
    alert('Key:\n'+FS.readFile('privkey.pem', {'encoding':'utf8'}));
// TODO: Display generated key in a nicer modal window, possibly with a fileblob download option
  }
// TODO: display any updates we may have (actually we probably won't have any yet, update when we get them, callback for 'updates' command?)
}
