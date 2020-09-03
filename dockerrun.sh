
hostport=49160
guestport=8080

echo Running VGMQ with port map $hostport:$guestport
docker run -p $hostport:$guestport -d vgmq
