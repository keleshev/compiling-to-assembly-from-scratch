.SECONDARY:
.PHONY: phony

CC = arm-linux-gnueabihf-gcc -static
RUN = qemu-arm-static
SOURCES = $(shell find . -name '*.ts')

default: test

test: build/test.exe phony
	$(RUN) ./$<

%.exe: %.s Makefile
	$(CC) $< -o $@

%.s: %.js Makefile
	node $< > $@

build/%.js: %.ts $(SOURCES) Makefile
	tsc --strict --outdir build --module commonjs --target es6 $<

web/build.js: $(SOURCES) Makefile
	tsc --strict --outfile web/build.js --module amd --target es6 $(SOURCES)

clean: phony
	rm -fr build
