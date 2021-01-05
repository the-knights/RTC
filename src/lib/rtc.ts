import SoundMeter from './soundmeter';
import events from 'events';

class RTC extends events.EventEmitter {
  constructor() {
    super();
    this.init();
  }

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
  audioContext = new AudioContext();
  stream?: MediaStream;
  audioVolumeTimer?: number; // 音量回调定时器
  currentResolution?: MediaStreamConstraints;

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
        console.warn('soundMeter.instant: %o', soundMeter.instant * 348 + 1);
        this.emit('audioVolume', 11);
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
}

export default new RTC();
