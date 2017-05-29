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
#include <string.h>
#include <poll.h>
#include <netdb.h>
#include <netinet/in.h>
#include <libsocial/udpstream.h>
#include "libwebsocket/websock.h"

const char* verifyproto(const char* path, const char* host, char* protocol, const char* origin)
{
  if(strcmp(path, "/")){return 0;}
  if(strcmp(protocol, "socialwebsock-0.1")){return 0;}
  return "socialwebsock-0.1";
}

void webpeer(int sock)
{
// printf("Handling connection...\n");
  websock_conn* conn=websock_new(sock, 1, "cert.pem", "priv.pem");
  if(!websock_handshake_server(conn, verifyproto, 0)){printf("Handshake failed\n"); return;}
  int udpsock=socket(PF_INET, SOCK_DGRAM, IPPROTO_UDP);
// TODO: First send a list of bootstrap peers, should this be binary too?
//  websock_write(conn, "127.0.0.1:4000", 14, WEBSOCK_TEXT);
  struct sockaddr_in bootstrapaddr={
    .sin_family=AF_INET,
    .sin_addr.s_addr=0x100007f,
    .sin_port=htons(4000),
    0
  };
  websock_write(conn, &bootstrapaddr, sizeof(bootstrapaddr), WEBSOCK_BINARY);
  // Listen to client and udpstream socket and pass messages back and forth (client handles the TLS within the udpstream)
  struct pollfd pfd[]={{.fd=sock, .events=POLLIN, .revents=0}, {.fd=udpsock, .events=POLLIN, .revents=0}};
  while(1)
  {
    poll(pfd, 2, -1);
    if(pfd[0].revents)
    {
printf("Handling websocket input...\n");
      pfd[0].revents=0;
      // Read the address
      struct websock_head head;
      if(!websock_readhead(conn, &head)){break;}
      socklen_t addrlen=head.length;
      char addr[addrlen];
      while(!websock_readcontent(conn, addr, &head));
      // Read the payload
      if(!websock_readhead(conn, &head)){break;}
      char buf[head.length];
      while(!websock_readcontent(conn, buf, &head));
      struct udpstream* stream=udpstream_find((struct sockaddr*)addr, addrlen);
      if(!stream) // TODO: Check against blocklist (don't let people use this service to flood others over UDP), also add a brief block for the entire host until we know this connection is ok
      {
        stream=udpstream_new(udpsock, (struct sockaddr*)addr, addrlen);
      }
// printf("Writing %u bytes\n", head.length);
      udpstream_write(stream, buf, head.length);
    }
    if(pfd[1].revents)
    {
printf("Handling udpsocket input...\n");
      pfd[1].revents=0;
      udpstream_readsocket(udpsock);
      struct udpstream* stream;
      while((stream=udpstream_poll()))
      {
        char buf[2048];
        ssize_t len=udpstream_read(stream, buf, 2048);
        if(len<1){udpstream_close(stream); continue;}
        struct sockaddr addr;
        socklen_t addrlen=sizeof(addr);
        udpstream_getaddr(stream, &addr, &addrlen);
        websock_write(conn, &addr, addrlen, WEBSOCK_BINARY);
        websock_write(conn, buf, len, WEBSOCK_BINARY);
      }
    }
  }
// TODO: At end of session, update the list of bootstrap peers
}
