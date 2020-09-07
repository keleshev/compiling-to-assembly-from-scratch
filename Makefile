.SECONDARY:
.PHONY: phony

CC = arm-linux-gnueabihf-gcc -static
RUN = qemu-arm-static

default: test

test: build/test.exe phony
	$(RUN) ./$<

%.exe: %.s Makefile
	$(CC) $< -o $@

%.s: %.js Makefile
	node $< > $@

build/%.js: %.ts Makefile
	tsc --strict --outdir build --module commonjs --target esnext $<

clean: phony
	rm -fr build
