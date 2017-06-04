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
#include <unistd.h> // Include it first because we're going to override some functions from there, but don't want to get any mess from the declarations
#include <fcntl.h>
#include <sys/socket.h>
#include <sys/stat.h>

#define read(fd,buf,size) jsglue_read(fd,buf,size)
#define write(fd,buf,size) jsglue_write(fd,buf,size)
#define open(path,flags,...) jsglue_open(path,flags,0)
#define stat(path,st) jsglue_stat(path,st)
#define close(fd) jsglue_close(fd)
#define mkdir(path,mode) 0 // Screw directories :)

extern ssize_t jsglue_read(int fd, void* buf, size_t size);
extern ssize_t jsglue_write(int fd, const void* buf, size_t size);
extern int jsglue_open(const char* path, int flags, mode_t mode);
extern int jsglue_stat(const char* path, struct stat* st);
extern void jsglue_close(int fd);
extern void(*websockproxy_write)(struct sockaddr*, socklen_t, const void*, size_t);
