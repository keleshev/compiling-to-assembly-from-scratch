CC = arm-linux-gnueabihf-gcc -static
RUN = qemu-arm-static

.PHONY: phony

default: test

test: test.exe phony
	$(RUN) ./$<

%.exe: %.s
	$(CC) $< -o $@

test.s: compiler.js
	node compiler.js > test.s

%.js: %.ts
	tsc --strict --module commonjs --target es6 $<

clean: phony
	rm *.exe *.s *.js

