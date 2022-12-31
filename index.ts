import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import {createStreamApplication} from "./create_stream_application"

const config = new pulumi.Config();

const youtubeRtmpServerURL = config.get('youtube-server-url') || 'rtmp://a.rtmp.youtube.com/live2';
const twitchRtmpServerUrl = config.get('twitch-server-url') || 'rtmp://qro03.contribute.live-video.net/app';
const metaLocalRtmpServerURL = 'rtmp://127.0.0.1:19350/rtmp/';

const rmtpDefaultPort = 1935;
const containerHostName = 'multistream';

const labels = {
    app: 'multistream-rtmp',
};

const streamRtmpNamespace = new k8s.core.v1.Namespace('multi-stream-rtmp-namespace', {
    metadata: {
        name: 'multistream-rtmp',
    },
});

const stringConfig = pulumi.all([
    config.requireSecret('twitch-stream-key'),
    config.requireSecret('facebook-stream-key'),
    config.requireSecret('youtube-stream-key'),
]).apply(([
              twitchStreamKey,
              facebookStreamKey,
              youtubeStreamKey,
          ]) => {

    const nginxApplication = createStreamApplication({
        name: 'podcast',
        live: true,
        record: false,
        urls: [
            `${twitchRtmpServerUrl}/${twitchStreamKey}`,
            `${youtubeRtmpServerURL}/${youtubeStreamKey}`,
            `${metaLocalRtmpServerURL}${facebookStreamKey}`,
        ],
    })


    return `
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

})

const nginxConfig = new k8s.core.v1.ConfigMap('multi-stream-nginx-config', {
    metadata: {
        name: 'multistream-nginx-config',
        namespace: streamRtmpNamespace.metadata.name,
    },
    data: {
        'nginx.conf': stringConfig,
    }
});

const streamRtmpServer = new k8s.apps.v1.Deployment('multi-stream-rtmp-server', {
    metadata: {
        name: 'multistream-rtmp-server',
        namespace: streamRtmpNamespace.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: labels,
        },
        template: {
            metadata: {
                labels: labels,
            },
            spec: {
                containers: [
                    {
                        name: 'nginx',
                        image: 'thiagoeolima/nginx-rtmps:v1.2.0',
                        command: [
                            'bash',
                            '-c',
                            `set -e; stunnel4; exec nginx -g 'daemon off;'`,
                        ],
                        ports: [
                            {
                                name: 'stream',
                                containerPort: rmtpDefaultPort,
                            },
                        ],
                        volumeMounts: [
                            {
                                name: 'config',
                                mountPath: '/etc/nginx',
                            },
                        ],
                        env: [
                            {
                                name: 'NGINX_HOST',
                                value: containerHostName,
                            },
                        ],
                    },
                ],
                volumes: [
                    {
                        name: 'config',
                        configMap: {
                            name: nginxConfig.metadata.name,
                        }
                    },
                ],
            },
        }
    },
}, {
    dependsOn: [
        nginxConfig,
    ]
});

const rtmpService = new k8s.core.v1.Service('rmtp-service', {
    metadata: {
        name: 'rtmp',
        namespace: streamRtmpNamespace.metadata.name,
        labels: {
            'app.kubernetes.io/name': 'ingress-nginx',
        },
    },
    spec: {
        type: 'NodePort',
        selector: labels,

        ports: [
            {
                protocol: 'TCP',
                port: rmtpDefaultPort,
                targetPort: rmtpDefaultPort,
                name: 'stream',
                nodePort: rmtpDefaultPort,
            },
        ],
    },
}, {
    dependsOn: [
        streamRtmpNamespace,
        streamRtmpServer,
    ],
});
