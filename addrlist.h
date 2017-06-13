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
#include <sys/socket.h>

struct addrlist
{
  struct sockaddr_storage* addr;
  unsigned int count;
  time_t updated;
};
extern struct addrlist verified;

extern char addrlist_check(struct sockaddr_storage* addr, socklen_t addrlen);
extern void addrlist_verify(struct sockaddr_storage* addr, socklen_t addrlen);
