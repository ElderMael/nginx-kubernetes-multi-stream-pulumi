[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-nginx/README.md)

# Multi-stream nginx RTMP Server

A pulumi project to deploy a nginx RTMP server that streams
to multiple URLs, configurable for Youtube, Facebook and Twitch

This can be used as an alternative to Restream if enough bandwidth 
is available

## How To Setup?

- Clone this project
- Setup the kube config if not wanting to use the default one:
  - Run `export KUBECONFIG=/path/to/config`
- Run `pulumi stack init` and create your own stack
- Setup the required stream keys:
  - Twitch, run `pulumi config set --secret 'twitch-stream-key' '<key>'`
  - Facebook, run `pulumi config set --secret 'facebook-stream-key' '<key>'`
  - Youtube, run `pulumi config set --secret 'youtube-stream-key' '<key>'`
- Create the infra with `pulumi up`

## How Does It Work?

This Pulumi project will install a nginx RTMP server using the image
[thiagoeolima/nginx-rtmps](https://github.com/thiagoeolima/nginx-rtmps)
as a base to stream to multiple RTMP endpoints at the same time.

For now it only supports:
- 
- Twitch
- Facebook (stunnel4 passthrough that will convert the stream to RTMPS)
- Youtube


## Generated With

This repository was created using the following command:

```bash
# Generated using the following command
$ pulumi new https://github.com/pulumi/examples.git/kubernetes-ts-nginx --force
```
