.PHONY: build push run
NAME=ypool

build:
	docker buildx build --platform "linux/arm64/v8"  -t registry.sep.dev/${NAME} --load .

push:
	docker push registry.sep.dev/${NAME}

run:
	docker run -p 3000:3000 registry.sep.dev/${NAME}

yeet: build push


deploy: yeet restart

restart:
	kubectl rollout restart deployment/${NAME} -n sep-dev

migrate-dev:
	echo "Make sure to port-forward the database to 5433"
	DATABASE_URL=postgresql://ypool:${DB_PWD}@localhost:5433/ypool?schema=service npx prisma migrate dev 