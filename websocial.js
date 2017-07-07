function chdisplay(old,newview)
{
  if(old){document.getElementById(old).style.display='none';}
  if(newview){document.getElementById(newview).style.display='block';}
}

function initgui()
{
  var key=document.getElementById('privkey').value;
// TODO: some basic checks that 'key' at least looks like it might be a key, otherwise set to '' so we get the key window
  chdisplay('login_window',(key=='')?'key_window':false);
  // Delay the actual work a tiny bit to make sure the "have patience" message is rendered first
  setTimeout(function()
  {
    init(key);
    key=FS.readFile('privkey.pem', {'encoding':'utf8'});
    // Display generated (or supplied, but later) key in a modal window with a fileblob download option
    chdisplay('key_generating', false);
    var w=document.getElementById('key_window');
    w.appendChild(document.createTextNode('Key:'));
    w.appendChild(document.createElement('br'));
    var text=document.createElement('textarea');
    text.value=key;
    text.readonly=true;
    text.style.width='90%';
    text.style.height='80%';
    w.appendChild(text);
    w.appendChild(document.createElement('br'));
    w.style.textAlign='left';
    w.style.padding='8px';
    w.style.height='60%';
    if(window.URL && URL.createObjectURL) // Unstable standard
    {
      var link=document.createElement('a');
      link.href=URL.createObjectURL(new Blob([key], {type:'application/x-pem-file'}));
      link.appendChild(document.createTextNode('Download'));
      link.download='privkey.pem';
      w.appendChild(link);
    }
    var button=document.createElement('button');
    button.appendChild(document.createTextNode('OK'));
    button.onclick=function(){chdisplay('key_window', false);};
    button.style.float='right';
    w.appendChild(button);
  }, 0);
// TODO: display any updates we may have (actually we probably won't have any yet, update when we get them, callback for 'updates' command?)
}
