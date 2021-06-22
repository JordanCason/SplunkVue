ps -ef | grep -i campaignGenerator | awk '{print $2}' | head -n 10 | xargs kill -9
