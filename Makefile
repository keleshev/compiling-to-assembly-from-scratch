CC = arm-linux-gnueabihf-gcc -static
RUN = qemu-arm-static

.PHONY: phony

default: test

test: test.exe phony
	$(RUN) ./$<

%.exe: %.s Makefile
	$(CC) $< -o $@

test.s: test.js Makefile
	node test.js > test.s

%.js: %.ts Makefile
	tsc --strict --module commonjs --target esnext $<

clean: phony
	rm -f *.exe *.s *.js .*.swp
