CFLAGS=$(shell pkg-config --cflags libsocial libwebsocket)
LIBS=$(shell pkg-config --libs libsocial libwebsocket)
EMSCRIPTVERSION=1.37.12
GMPVERSION=6.1.2
NETTLEVERSION=3.3
GNUTLSVERSION=3.5.12
SOCIALNETWORKREVISION=9e11beb56de1c867b1339fef577c97c2ac619d59
REVISION=$(shell git log | sed -n -e 's/^commit //p;q')
JSLIBS=$(shell PKG_CONFIG_PATH=toolchain/usr/lib/pkgconfig pkg-config --libs gnutls nettle hogweed) -lgmp
JSCFLAGS=$(shell PKG_CONFIG_PATH=toolchain/usr/lib/pkgconfig pkg-config --cflags gnutls)

all: webpeer libsocial.js

webpeer: daemon.o webpeer.o
	$(CC) $^ $(LIBS) -o $@

toolchain/usr/bin/emcc: emscripten-$(EMSCRIPTVERSION).tar.gz emscripten-fastcomp-$(EMSCRIPTVERSION).tar.gz emscripten-fastcomp-clang-$(EMSCRIPTVERSION).tar.gz
	./buildtoolchain.sh '$(EMSCRIPTVERSION)'

toolchain/usr/lib/libsocial.so: toolchain/usr/bin/emcc
	./buildlibs.sh '$(GMPVERSION)' '$(NETTLEVERSION)' '$(GNUTLSVERSION)'

libsocial.js: jsglue.c toolchain/usr/lib/libsocial.so
	toolchain/usr/bin/emcc -O3 -s EXPORTED_FUNCTIONS="['_social_init','_peer_handlesocket','_peer_new_unique','_websockproxy_read','_websockproxy_setwrite','_jsglue_addfile']" -s RESERVED_FUNCTION_POINTERS=1 -s NO_EXIT_RUNTIME=1 -s NODEJS_CATCH_EXIT=0 -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap']" -s INVOKE_RUN=0 $(JSCFLAGS) $^ $(JSLIBS) -o $@
	./squeezeandcomment.sh '$@' 'This code was built from gmp $(GMPVERSION), nettle $(NETTLEVERSION), gnutls $(GNUTLSVERSION) and socialnetwork git revision $(SOCIALNETWORKREVISION) with tweaks from socialnetwork-web git revision $(REVISION) using emscripten (fastcomp) $(EMSCRIPTVERSION)'

# Download all external sources we'll need
download:
	wget -c 'https://github.com/kripken/emscripten-fastcomp/archive/$(EMSCRIPTVERSION)/emscripten-fastcomp-$(EMSCRIPTVERSION).tar.gz'
	wget -c 'https://github.com/kripken/emscripten-fastcomp-clang/archive/$(EMSCRIPTVERSION)/emscripten-fastcomp-clang-$(EMSCRIPTVERSION).tar.gz'
	wget -c 'https://github.com/kripken/emscripten/archive/$(EMSCRIPTVERSION)/emscripten-$(EMSCRIPTVERSION).tar.gz'
	wget -c 'https://ftp.gnu.org/gnu/gmp/gmp-$(GMPVERSION).tar.xz'
	wget -c 'https://ftp.gnu.org/gnu/nettle/nettle-$(NETTLEVERSION).tar.gz'
	wget -c 'ftp://ftp.gnutls.org/gcrypt/gnutls/v$(shell echo '$(GNUTLSVERSION)' | cut -d '.' -f 1-2)/gnutls-$(GNUTLSVERSION).tar.xz'
	git clone https://ion.nu/git/socialnetwork || (cd socialnetwork && git pull origin master)
	cd socialnetwork && git checkout $(SOCIALNETWORKREVISION)
