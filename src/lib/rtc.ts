import SoundMeter from './soundmeter';
import events from 'events';

class RTC extends events.EventEmitter {
  audioContext: AudioContext;

  //QVGA 320*240
  qvgaConstraints = {
    video: { width: { exact: 320 }, height: { exact: 240 } },
  };

  //VGA 640*480
  vgaConstraints = {
    video: { width: { exact: 640 }, height: { exact: 480 } },
  };

  //高清 1280*720
  hdConstraints = {
    video: { width: { exact: 1280 }, height: { exact: 720 } },
  };

  //超清 1920*1080
  fullHdConstraints = {
    video: { width: { exact: 1920 }, height: { exact: 1080 } },
  };

  deviceInfos: MediaDeviceInfo[] | undefined;
  cameraDevicesList = null;
  stream?: MediaStream;
  audioVolumeTimer?: number = 0; // 音量回调定时器
  currentResolution?: MediaStreamConstraints;
  mediaRecorder?: MediaRecorder;
  recordedBlobs: Blob[] = [];

  constructor() {
    super();
    this.init();
    this.audioContext = new AudioContext();
  }

  // TODO: 初始化 rtc 基本信息（设备列表）
  async init() {
    await this.getDevicesInfo();
  }

  async getDevicesInfo() {
    try {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      console.warn('deviceInfos: %o', deviceInfos);
      this.deviceInfos = deviceInfos;
    } catch (e) {
      console.log('navigator.MediaDevices.getUserMedia error: ', e.message, e.name);
    }
  }

  getVideoDeviceInfos() {
    const videoDevicesList = this.deviceInfos?.filter((v) => {
      return v.kind === 'videoinput';
    });
    return videoDevicesList;
  }

  getAudioDeviceInfos() {
    const audioDevicesList = this.deviceInfos?.filter((v) => {
      return v.kind === 'audioinput';
    });
    return audioDevicesList;
  }

  getSpeakerDeviceInfos() {
    const speakerDeviceInfos = this.deviceInfos?.filter((v) => {
      return v.kind === 'audiooutput';
    });
    return speakerDeviceInfos;
  }

  async startVideoStream(view: HTMLVideoElement | null) {
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: this.hdConstraints.video,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (view) {
        view.srcObject = this.stream;
      }
    } catch (error) {
      this._handleAudioError(error);
    }
  }

  async startAudioStream() {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      this._handleAudioError(error);
    }
  }

  // TODO: 获取麦克风音量
  getAudioVolume() {
    console.warn('this.audioContext: %o', this.audioContext);
    // SoundMeter 声音测量,用于做声音音量测算使用
    const soundMeter = new SoundMeter(this.audioContext);
    // 将声音测量对象与流连接起来
    soundMeter.connectToSource(this.stream, (e: Error) => {
      if (e) {
        console.error(e);
        return;
      }
      // 开始实时读取音量值
      this.audioVolumeTimer = window.setInterval(() => {
        const volume = soundMeter.instant * 348 + 1;
        this.emit('audioVolume', volume);
      }, 200);
    });
    console.warn('getAudioVolume: %o');
  }

  // 停止音频流
  stopAudioStream() {
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => {
        track.stop();
      });
      this.stopAudioVolume();
    }
  }

  stopAudioVolume() {
    // 清除音量定时器
    clearInterval(this.audioVolumeTimer);
  }

  // 停止视频流
  stopVideoStream() {
    if (this.stream) {
      this.stream.getVideoTracks().forEach((track) => {
        track.stop();
      });
    }
  }

  //获取音频轨道列表
  getAudioTracks = () => {
    console.log('getAudioTracks');
    //返回一个数据
    console.log(this.stream?.getAudioTracks());
    return this.stream?.getAudioTracks();
  };

  //根据Id获取音频轨道
  getTrackById = () => {
    console.log('getTrackById');
    console.log(this.stream?.getTrackById(this.stream?.getAudioTracks()[0].id));
    return this.stream?.getTrackById(this.stream?.getAudioTracks()[0].id);
  };

  //删除音频轨道
  removeAudioTrack = () => {
    console.log('removeAudioTrack()');
    this.stream?.removeTrack(this.stream.getAudioTracks()[0]);
  };

  //获取所有轨道,包括音频及视频
  getTracks = () => {
    console.log('getTracks()');
    console.log(this.stream?.getTracks());
    return this.stream?.getTracks();
  };

  //获取视频轨道列表
  getVideoTracks = () => {
    console.log('getVideoTracks()');
    console.log(this.stream?.getVideoTracks());
    return this.stream?.getVideoTracks();
  };

  //删除视频轨道
  removeVideoTrack = () => {
    console.log('removeVideoTrack()');
    this.stream?.removeTrack(this.stream.getVideoTracks()[0]);
  };

  startRecord() {
    const types = [
      'video/webm',
      'audio/webm',
      'video/webm;codecs=vp8',
      'video/webm;codecs=daala',
      'video/webm;codecs=h264',
      'audio/webm;codecs=opus',
      'video/mpeg',
    ];

    for (const i in types) {
      console.log(
        'Is ' +
          types[i] +
          ' supported? ' +
          (MediaRecorder.isTypeSupported(types[i]) ? 'Maybe!' : 'Nope :('),
      );
    }
    // 媒体类型
    const options: MediaRecorderOptions = {
      mimeType: 'audio/webm;codecs=opus',
    };
    try {
      // 初始化 MediaRecorder 对象,传入音频流及媒体类型
      if (this.stream) {
        this.mediaRecorder = new MediaRecorder(this.stream, options);

        //录制停止事件回调
        this.mediaRecorder.onstop = (event) => {
          console.log('Recorder stopped: ', event);
          console.log('Recorded Blobs: ', this.recordedBlobs);
          this.emit('recorder-stop');
        };

        //当数据有效时触发的事件,可以把数据存储到缓存区里
        this.mediaRecorder.ondataavailable = (event) => {
          // console.log('handleDataAvailable', event);
          //判断是否有数据
          if (event.data && event.data.size > 0) {
            //将数据记录起来
            this.recordedBlobs?.push(event.data);
          }
        };

        // 录制 10 秒
        this.mediaRecorder.start(10);
        console.log('MediaRecorder started', this.mediaRecorder);
      }
    } catch (e) {
      console.error('MediaRecorder创建失败:', e);
      return;
    }
  }

  startVideoRecord() {
    const options = this._isMimeTypeSupported();

    try {
      if (this.stream) {
        //创建MediaRecorder对象,准备录制
        this.mediaRecorder = new MediaRecorder(this.stream, options);
        this.recordedBlobs = [];

        //录制停止事件监听
        this.mediaRecorder.onstop = (event) => {
          console.log('录制停止: ', event);
          console.log('录制的Blobs数据为: ', this.recordedBlobs);
          this.emit('recorder-stop');
        };
        this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);

        // 开始录制并指定录制时间为10秒
        this.mediaRecorder.start(10);
        console.log('MediaRecorder started', this.mediaRecorder);
      }
    } catch (e) {
      console.error('创建MediaRecorder错误:', e);
      return;
    }
  }

  handleDataAvailable(event: BlobEvent) {
    console.log('handleDataAvailable', event);
    //判断是否有数据
    if (event.data && event.data.size > 0) {
      console.warn('event.data: %o', event.data);
      //将数据记录起来
      this.recordedBlobs?.push(event.data);
      console.warn('this.recordedBlobs: %o', this.recordedBlobs);
    }
  }

  //停止录制
  stopRecord() {
    console.warn('this: %o', this.mediaRecorder);
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder?.stop();
    }
  }

  // 点击下载录制文件
  downloadFileHandler = () => {
    // 生成 blob 文件,类型为 video/webm
    const blob = new Blob(this.recordedBlobs, { type: 'video/webm' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    // 指定下载文件及类型
    a.download = 'test.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      // URL.revokeObjectURL() 方法会释放一个通过 URL.createObjectURL() 创建的对象URL.
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  // 播放录制数据
  playRecordAudio(el: HTMLAudioElement | null) {
    if (el) {
      // 生成 blob 文件,类型为 audio/webm
      const blob = new Blob(this.recordedBlobs, { type: 'audio/webm' });

      el.src = '';
      // 根据 blob 文件生成播放器的数据源
      el.src = window.URL.createObjectURL(blob);
      // 播放声音
      el.play();
    }
  }

  _handleVideoError(error: DOMException) {
    console.error('error: %o', error);
    if (error.name === 'ConstraintNotSatisfiedError') {
      const v = this.currentResolution?.video;
      //宽高尺寸错误
      console.error(`宽:${v} 高:${v} 设备不支持`);
    } else if (error.name === 'PermissionDeniedError') {
      console.error('没有摄像头和麦克风使用权限,请点击允许按钮');
    }
    console.error(`getUserMedia 错误: ${error.name}`, error);
  }

  // 麦克风错误处理
  _handleAudioError(error: DOMException) {
    if (error.name === 'PermissionDeniedError') {
      console.error('没有摄像头和麦克风使用权限,请点击允许按钮');
    }
    console.error('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
  }

  _isMimeTypeSupported() {
    //指定 mimeType 类型,依次判断是否支持vp9 vp8编码格式
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error('video/webm;codecs=vp9不支持');
      options = { mimeType: 'video/webm;codecs=vp8' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error('video/webm;codecs=vp8不支持');
        options = { mimeType: 'video/webm' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.error(`video/webm不支持`);
          options = { mimeType: '' };
        }
      }
    }
    return options;
  }
}

export default new RTC();
