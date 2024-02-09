build:
	# Build the docker image
	docker build -t battleserver .

docker-run:
	# Run the docker image
	docker run -p 8080:8080 --rm --name battleserver-container battleserver

docker-tag:
	# Tag the docker image
	docker tag battleserver:latest gcr.io/wordrivalry/battleserver:latest

docker-push:
	# Push the docker image to Google Cloud Registry
	docker push gcr.io/wordrivalry/battleserver:latest

docker-deploy: build docker-tag docker-push
	# Deploy the docker image to Google Cloud Run
	gcloud run deploy battleserver --image gcr.io/wordrivalry/battleserver:latest --platform managed --allow-unauthenticated

# Had to run `gcloud config set project wordrivalry` to set the project to wordrivalry in gcloud cli