/*
    socialnetwork-web, peer-to-peer social network web client
    Copyright (C) 2017  alicia@ion.nu

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License version 3
    as published by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
function chdisplay(old,newview)
{
  if(old){document.getElementById(old).style.display='none';}
  if(newview){document.getElementById(newview).style.display='block';}
}

function dom_clear(element)
{
  while(element.childNodes.length>0)
  {
    element.removeChild(element.childNodes[0]);
  }
}

function initgui()
{
  var key=document.getElementById('privkey').value;
// TODO: some basic checks that 'key' at least looks like it might be a key, otherwise set to '' so we still get the key window
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
  }, 100);
// TODO: display any updates we may have (actually we probably won't have any yet, update when we get them, callback for 'updates' command?)
}

function page_friends()
{
  var display=document.getElementById('display');
  dom_clear(display);
  var box=document.createElement('div');
  box.style.width='intrinsic';
  box.style.width='-webkit-max-content';
  box.style.width='-moz-max-content';
  box.style.width='max-content';
  box.style.marginLeft='auto';
  box.style.marginRight='auto';
  var entry=document.createElement('input');
  entry.placeholder='SocialNetwork ID';
  entry.size=64;
  box.appendChild(entry);
  var circles=getcircles();
  var circle=document.createElement('select');
  // List existing circles
  for(item of circles)
  {
    var option=document.createElement('option');
    option.value=item.index;
    option.appendChild(document.createTextNode(item.name));
    circle.appendChild(option);
  }
  var option=document.createElement('option');
  option.value='new';
  option.text='New circle';
  circle.appendChild(option);
  circle.onchange=function()
  {
    if(this.value=='new')
    {
      circle_openconfig(newcircle(), this.selectedOptions[0]);
    }
  }
  box.appendChild(circle);
  var button=document.createElement('button');
  button.appendChild(document.createTextNode('Add friend'));
  button.onclick=function()
  {
    if(circle.value=='new') // Need to create the circle first
    {
      circle.onchange();
      return;
    }
    var id=hextobin(entry.value);
    social_addfriend(id, circle.value);
    page_friends();
  };
  box.appendChild(button);
  display.appendChild(box);
  // TODO: Make this prettier, links to individual profile pages and get the name property
  for(item of circles)
  {
    display.appendChild(document.createTextNode('Circle '+item.name+': '));
    var button=document.createElement('button');
    button.appendChild(document.createTextNode('Options'));
    button.dataset.index=item.index;
    button.onclick=function(){circle_openconfig(this.dataset.index, false);};
    display.appendChild(button);
    display.appendChild(document.createElement('br'));
    var count=circle_getcount(item.index);
    for(var i=0; i<count; ++i)
    {
      var user=circle_getid(item.index, i);
      display.appendChild(document.createTextNode(user));
      display.appendChild(document.createElement('br'));
    }
  }
}

function page_user(id)
{
  if(!id){id=self_getid();} // No ID = show our own page
  var display=document.getElementById('display');
  dom_clear(display);
  // TODO: Get and present fields
  var user=getuser(id);
  display.appendChild(document.createTextNode(id+':'));
  display.appendChild(document.createElement('br'));
  var button=document.createElement('button');
  button.name='postbutton';
  button.onclick=postwidget;
  button.appendChild(document.createTextNode('Create update'));
  display.appendChild(button);
  display.appendChild(document.createElement('br'));
  display.appendChild(document.createTextNode(user.updatecount+' updates'));
  for(var i=1; i<=user.updatecount && i<=20; ++i)
  {
    var update=user_getupdate(user, user.updatecount-i);
    if(update.type=='Circle'){continue;} // Don't display circle changes
    var box=document.createElement('div');
    box.className='update';
    var date=new Date(update.timestamp*1000);
    box.appendChild(document.createTextNode('Posted at: '+date.toLocaleString()));
    box.appendChild(document.createElement('br'));
    box.appendChild(document.createTextNode('Update type: '+update.type));
    // Display type-specific data
    if(update.type=='Post')
    {
      box.appendChild(document.createElement('br'));
      box.appendChild(document.createTextNode('Message: '+update.message));
    }
    display.appendChild(document.createElement('br'));
    display.appendChild(box);
  }
// TODO: Option to load more updates
}

function privacy_openconfig(prefix, priv)
{
  var circlebox=document.getElementById(prefix+'_privacy_circles');
  dom_clear(circlebox);
  var listed=[];
  function listcircle(item, check)
  {
    if(listed.indexOf(item.index)>-1){return;}
    listed.push(item.index);
    var label=document.createElement('label');
    if(item.title){label.title=item.title;}
    var checkbox=document.createElement('input');
    if(check){checkbox.checked=true;}
    checkbox.type='checkbox';
    checkbox.name=prefix+'_privacy_circles';
    checkbox.value=item.index;
    checkbox.dataset.name=item.name;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(item.name+' '));
    circlebox.appendChild(label);
  }
  if(priv) // Populate with circles from existing privacy
  {
    document.getElementById(prefix+'_privacy').value=priv.flags; // And the flags
    for(item of priv.circles)
    {
      listcircle(item, true);
    }
  }
  // Populate with circles from libsocial
  var circles=getcircles();
  for(item of circles)
  {
    listcircle(item, false);
  }
}

function privacy_save(prefix)
{
  var circles=[];
  var flags=document.getElementById(prefix+'_privacy').value;
  var items=document.getElementsByName(prefix+'_privacy_circles');
  for(item of items)
  {
    if(item.checked){circles.push({'index':parseInt(item.value),'name':item.dataset.name});}
  }
  return new privacy(flags, circles);
}

var configcircle_index;
var configcircle_option=false;
function circle_openconfig(index, option)
{
  configcircle_option=option;
  if(option && option.value=='new')
  {
    var priv={'flags':0,'circles':[{
      'index':index,
      'name':'This circle',
      'title':'Let friends in this circle know about your other friends in the circle'
    }]};
  }else{
    var priv=circle_getprivacy(index);
  }
  privacy_openconfig('circle', priv);
  var name=document.getElementById('circle_name');
  name.value=circle_getname(index);
  configcircle_index=index;
  chdisplay(false,'circle_window');
}

function circle_save()
{
  var name=document.getElementById('circle_name').value;
  var priv=privacy_save('circle');
  setcircle(configcircle_index, name, priv.flags, priv.bincircles(), priv.circles.length);
  if(configcircle_option)
  {
    var select=configcircle_option.parentNode;
    // Update list of circles
    configcircle_option.text=name;
    configcircle_option.value=configcircle_index;
    configcircle_option=false;
    // Make a new 'new circle' option?
    var option=document.createElement('option');
    option.value='new';
    option.text='New circle';
    select.appendChild(option);
  }
  chdisplay('circle_window',false);
}

var postwidgetbox=false;
var postprivacy=new privacy(0,[]);
function postwidget()
{
// TODO: Differences in widgets for posts on others walls or in response to other posts?
  if(postwidgetbox && postwidgetbox.parentNode)
  {
    postwidgetbox.parentNode.removeChild(postwidgetbox);
  }
  postwidgetbox=document.createElement('div');
// TODO: Configurable default privacy?
  var privtext=document.createTextNode('Privacy: '+postprivacy.toString());
  postwidgetbox.appendChild(privtext);
  button=document.createElement('button');
  button.appendChild(document.createTextNode('Change'));
  button.onclick=function()
  {
    privacy_openconfig('generic', postprivacy);
    document.getElementById('privacy_button').onclick=function()
    {
      postprivacy=privacy_save('generic');
      chdisplay('privacy_window', false);
      privtext.textContent='Privacy: '+postprivacy.toString();
    };
    chdisplay(false, 'privacy_window');
  };
  postwidgetbox.appendChild(button);
  postwidgetbox.appendChild(document.createElement('br'));
// TODO: Non-text posts, maybe media for starters
  var text=document.createElement('textarea');
  postwidgetbox.appendChild(text);
  postwidgetbox.appendChild(document.createElement('br'));
  // Submit button
  button=document.createElement('button');
  button.appendChild(document.createTextNode('Post'));
  button.onclick=function()
  {
    createpost(text.value, postprivacy.flags, postprivacy.bincircles(), postprivacy.circles.length);
// TODO: Instead of reloading the user page, insert the update and hide the postwidget (and re-show postbutton)
    page_user(false);
  };
  postwidgetbox.appendChild(button);
  // Re-show all postbuttons
  var buttons=document.getElementsByName('postbutton');
  for(button of buttons)
  {
    button.style.display='inline';
  }
  // Hide this one and insert postwidget
  this.style.display='none';
  this.parentNode.insertBefore(postwidgetbox, this);
}
