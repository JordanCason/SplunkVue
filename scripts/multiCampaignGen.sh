for instance in {1..15}; do
	node campaignGenerator.js seconds=60 type=SSMUMSMF >> output.txt &
	sleep 1
done
