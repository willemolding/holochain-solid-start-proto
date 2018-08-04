
.PHONY: test start-debug

# web.pid:
# 	fswatch ./ui | xargs -n1 './restart.sh' &

# start-web:	web.pid
# 	touch ./ui/index.html

# stop-web:	web.pid
# 	kill $$( cat web.pid )

find-server-process:
	ps -ef | grep hcdev

start-debug:
	HC_ENABLE_ALL_LOGS=1 hcdev --debug --verbose web > ./server.log 2>&1 & echo $$! > hcdev.pid
	node data/load.js

stop:
	kill $$( cat hcdev.pid )

logs:
	less -r +F ./server.log

restart: stop start-debug

test:
	hcdev test
