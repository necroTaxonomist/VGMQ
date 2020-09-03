
id=$(docker ps -q --filter ancestor=vgmq)

if [ -z "$id" ]
then
    echo No VGMQ container is active
    exit 1
fi

echo Stopping VGMQ container with ID $id...
docker stop $id
