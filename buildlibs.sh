#!/bin/sh -e
#   socialnetwork-web, peer-to-peer social network web client
#   Copyright (C) 2017  alicia@ion.nu
#
#   This program is free software: you can redistribute it and/or modify
#   it under the terms of the GNU Affero General Public License version 3
#   as published by the Free Software Foundation.
#
#   This program is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU Affero General Public License for more details.
#
#   You should have received a copy of the GNU Affero General Public License
#   along with this program.  If not, see <http://www.gnu.org/licenses/>.

prefix="`pwd`/toolchain/usr"
export PATH="${prefix}/bin:${PATH}"
export PKG_CONFIG_PATH="${prefix}/lib/pkgconfig"
export CFLAGS='-O3'
export LDFLAGS='-O3'
GMPVERSION="$1"
NETTLEVERSION="$2"
GNUTLSVERSION="$3"

cd toolchain
# gmp
tar -xJf "../gmp-${GMPVERSION}.tar.xz"
cd "gmp-${GMPVERSION}"
mkdir -p build
cd build
emconfigure ../configure --prefix="$prefix" --disable-static --enable-shared --disable-assembly ABI=32 ac_cv_sizeof_mp_limb_t=4
make
make install
cd ../..

# nettle
tar -xzf "../nettle-${NETTLEVERSION}.tar.gz"
cd "nettle-${NETTLEVERSION}"
# Remove emscripten-incompatible options
sed -i -e 's/ -ggdb3//' configure
# Work around emscripten limitations with fopen in configure
sed -i -e 's/FILE *\* *f *= *fopen *( *\("[^"]*"\)/#include <unistd.h>\n#include <fcntl.h>\nint fd=open(\1, O_WRONLY|O_CREAT|O_TRUNC, 0644);\nFILE*f=fdopen(fd/' configure
mkdir -p build
cd build
emconfigure ../configure --prefix="$prefix" --disable-static --enable-shared --disable-assembler --disable-documentation LDFLAGS="-L${prefix}/lib -I${prefix}/include" CFLAGS="-I${prefix}/include" ac_cv_sizeof_char=1 ac_cv_sizeof_int=4 ac_cv_sizeof_long=4 ac_cv_sizeof_short=2 ac_cv_sizeof_size_t=4 ac_cv_sizeof_voidp=4
make GMP_NUMB_BITS=32
make install
cd ../..

# gnutls
tar -xJf "../gnutls-${GNUTLSVERSION}.tar.xz"
cd "gnutls-${GNUTLSVERSION}"
mkdir -p build
cd build
emconfigure ../configure --prefix="$prefix" --disable-static --enable-shared --with-included-libtasn1 --disable-hardware-acceleration --disable-dtls-srtp-support --disable-srp-authentication --disable-psk-authentication --disable-openpgp-authentication --disable-ocsp --disable-openssl-compatibility --disable-nls --disable-libdane --without-tpm --without-p11-kit --disable-tests --disable-cxx --disable-tools --with-included-unistring --with-zlib ac_cv_sizeof_char_p=4 ac_cv_sizeof_long=4 ac_cv_sizeof_short=2 ac_cv_sizeof_unsigned_int=4 ac_cv_sizeof_unsigned_long_int=4 ac_cv_sizeof_void_p=4 LDFLAGS="-L${prefix}/lib"
make
make install defexec_DATA=

# socialnetwork
cd ../../../socialnetwork
# Get rid of code and structures that were needed for UDP, add some stuff needed for websockets
if [ ! -e .patched ]; then
  sed -i -e 's|^ *stream_send|// &|
s/if(.*timestamp.*/if(0)/
s|^[^/].*sentpacket|// &|
s|^static\(.* stream_new(\)|\1|
/stream_send.*TYPE_PAYLOAD/a websockproxy_write(&stream->addr, stream->addrlen, buf, size);
/time_t timestamp;/a uint16_t wsseq;
/stream=malloc/a stream->wsseq=0;' udpstream.c
  sed -i -e 's|^ *udpstream_readsocket|// &|' peer.c
  touch .patched
fi
# Expose internal structures that we need to interact with to inject packets from websockets
mkdir -p "${prefix}/include/libsocial"
sed -n -e '/^struct [^()*]*$/,/^}/p' udpstream.c > "${prefix}/include/libsocial/udpstream_private.h"
emmake make PREFIX="$prefix" CC='emcc -include ../jsglue.h -O3'
emmake make install PREFIX="$prefix"
