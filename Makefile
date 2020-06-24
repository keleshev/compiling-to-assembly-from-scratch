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
	tsc --target ESNEXT $<

clean: phony
	rm *.exe *.s *.js

# Legacy:

default: phony
	ocaml c.ml > tmp.s && make tmp.exe

%.exe: %.s phony
	@arm-linux-gnueabihf-gcc -static -o $@ $<
	@-qemu-arm-static $@; echo "\nExit code: $$?"
	@rm -f $@

ts: phony
	tsc --target ESNEXT compiler.ts && node compiler.js | tee /dev/tty > tmp.s && make tmp.exe

