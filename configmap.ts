import * as pulumi from "@pulumi/pulumi";
import {createStreamApplication} from "./create_stream_application";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();

const youtubeRtmpServerURL = config.get('youtube-server-url') || 'rtmp://a.rtmp.youtube.com/live2';
const twitchRtmpServerUrl = config.get('twitch-server-url') || 'rtmp://qro03.contribute.live-video.net/app';
const metaLocalRtmpServerURL = 'rtmp://127.0.0.1:19350/rtmp/';


export function createNginxConfigMap(options: {
    namespace: k8s.core.v1.Namespace;
    twitchStreamKey: string;
    facebookStreamKey: string;
    youtubeStreamKey: string;
}): k8s.core.v1.ConfigMap {

    const nginxApplication = createStreamApplication({
        name: 'podcast',
        live: true,
        record: false,
        urls: [
            `${twitchRtmpServerUrl}/${options.twitchStreamKey}`,
            `${youtubeRtmpServerURL}/${options.youtubeStreamKey}`,
            `${metaLocalRtmpServerURL}${options.facebookStreamKey}`,
        ],
    })


    const stringConfig = `
worker_processes auto;
rtmp_auto_push on;
rtmp_auto_push_reconnect 1s;
events {}

error_log /dev/stdout debug;

rtmp {
    server {
    
        access_log /dev/stdout;

        listen 1935;
        
        ${nginxApplication} 
    }
}
    `;

    return new k8s.core.v1.ConfigMap('multi-stream-nginx-config', {
        metadata: {
            name: 'multistream-nginx-config',
            namespace: options.namespace.metadata.name,
        },
        data: {
            'nginx.conf': stringConfig,
        }
    });

}
