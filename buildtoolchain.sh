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

EMSCRIPTVERSION="$1"
mkdir -p toolchain
cd toolchain
prefix="`pwd`/usr"
export PATH="${prefix}/bin:${PATH}"
# Set up pkg-config path
mkdir -p usr/lib
ln -sf "../../emscripten-${EMSCRIPTVERSION}/system/local/lib/pkgconfig" usr/lib
# Build emscripten LLVM/Clang
tar -xzf "../emscripten-fastcomp-${EMSCRIPTVERSION}.tar.gz"
cd "emscripten-fastcomp-${EMSCRIPTVERSION}"
tar -xzf "../../emscripten-fastcomp-clang-${EMSCRIPTVERSION}.tar.gz"
mv "emscripten-fastcomp-clang-${EMSCRIPTVERSION}" tools/clang
mkdir -p build
cd build
cmake -DCMAKE_INSTALL_PREFIX="${prefix}" -DLLVM_TARGETS_TO_BUILD="X86;JSBackend" ..
make
make install
cd ../..
# Install the emscripten tools/wrappers
tar -xzf "../emscripten-${EMSCRIPTVERSION}.tar.gz"
cd "emscripten-${EMSCRIPTVERSION}"
for prog in `ls | grep '^em' | grep -v '\.'`; do
  ln -sf "`pwd`/${prog}" "${prefix}/bin"
done
cd ..
emcc -v
mkdir -p "emscripten-${EMSCRIPTVERSION}/system/local/lib/pkgconfig"
