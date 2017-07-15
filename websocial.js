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
      configcircle_option=this.selectedOptions[0];
      circle_openconfig(newcircle());
    }
  }
  box.appendChild(circle);
  var button=document.createElement('button');
  button.appendChild(document.createTextNode('Add friend'));
  button.onclick=function()
  {
    if(circle.value=='new') // Need to create the circle first
    {
      configcircle_option=circle.selectedOptions[0]; // option;
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
    display.appendChild(document.createTextNode('Circle '+item.name+':'));
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

var configcircle_index;
var configcircle_option=false;
function circle_openconfig(index)
{
  // TODO: Move circle-list population to its own function? likely needed for other privacy settings
  var circles=document.getElementById('circle_circles');
  dom_clear(circles);
  // TODO: Populate with circles from libsocial
  // TODO: Store index and checkbox elements for circle_save()
  var name=document.getElementById('circle_name');
  name.value=circle_getname(index);
  configcircle_index=index;
  chdisplay(false,'circle_window');
}

function circle_save()
{
  var name=document.getElementById('circle_name');
  circle_setname(configcircle_index, name.value);
  if(configcircle_option)
  {
    var select=configcircle_option.parentNode;
    // Update list of circles
    configcircle_option.text=name.value;
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
