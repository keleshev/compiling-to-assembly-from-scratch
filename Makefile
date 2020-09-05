CC = arm-linux-gnueabihf-gcc -static
RUN = qemu-arm-static

.PHONY: phony

default: test
	$(MAKE) clean

test: test.exe phony
	$(RUN) ./$<

%.exe: %.s
	$(CC) $< -o $@

test.s: test.js
	node test.js > test.s

%.js: %.ts
	tsc --module commonjs --target esnext $<

clean: phony
	rm -f *.exe *.s *.js .*.swp
