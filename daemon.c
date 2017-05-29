/*
    webpeer, a websocket-udpstream proxy for socialnetwork-web
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
#include <stdio.h>
#include <unistd.h>
#include <netinet/in.h>
extern void webpeer(int sock);

int main()
{
  int sock=socket(PF_INET, SOCK_STREAM, IPPROTO_TCP);
  struct sockaddr_in addr;
  addr.sin_family=AF_INET;
  addr.sin_addr.s_addr=0;
  addr.sin_port=htons(5000);
  while(bind(sock, (struct sockaddr*)&addr, sizeof(addr))){perror("bind"); sleep(10);}
  listen(sock, 10);
  while(1)
  {
    struct sockaddr addr;
    socklen_t socklen=sizeof(addr);
    int client=accept(sock, &addr, &socklen);
    if(!fork())
    {
      close(sock);
      webpeer(client);
      _exit(1);
    }
    close(client);
  }
}
