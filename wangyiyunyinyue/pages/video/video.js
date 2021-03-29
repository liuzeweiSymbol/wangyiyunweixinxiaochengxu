import request from '../../utils/request'
Page({

    /**
     * 页面的初始数据
     */
    data: {
        videoGroupList: [], //视频导航分类列表
        navActive: "", //导航分类标识
        videoList: [], //视频列表数据
        videoId: '', //视频id标识
        videoUpdateTime: [], //记录video播放的时长
        isTriggered: false, //标识下拉刷新是否被触发
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        //获取视频导航分类标签
        this.getVideoGroupListData()
    },
    //获取视频导航分类标签
    async getVideoGroupListData() {
        let resultNavList = await request({
            url: "/video/group/list",
            method: "get",
        })
        // console.log(resultNavList);
        this.setData({
            videoGroupList: resultNavList.data.slice(0, 14),
            // navActive:resultNavList.data[0].name//一进页面把下标0的name赋值到navActive,这样一进页面默认第一个分类就有下划线了id
            navActive: resultNavList.data[0].id //用id做
        })
        //获取视频导航分类标签下对应的视频数据
        this.getVideoList(this.data.navActive) //navAtive是异步的,放到这里,这里navAcive是同步的了,异步获取到的是空字符串,同步才能获取到数据
    },
    //当前分类出现下划线
    changeNav(event) {
        let navId = event.target.id;
        // console.log(event.target.id);
        // console.log( typeof navId);//通过id传参会自动把参数变为string类型;通过data-传参不会转换数据类型,传的是什么类型,接收到的就是什么类型,//使用位移运算符也可以将字符串的数字转换为number类型的数字("2">>>0)
        this.setData({
            navActive: navId >>> 0,
            videoList: [], //切换分类导航时,把视频列表清空
        })
        //切换分裂导航时候,应该显示正在加载
        wx.showLoading({
            title: '正在加载中',
        })
        //动态获取当前导航对应的视频数据
        this.getVideoList(this.data.navActive)
    },

    //获取视频标签下对应的视频数据
    async getVideoList(navId) {
        let result = await request({
            url: "/video/group",
            method: "get",
            data: {
                id: navId, //必须时导航分类(videoGroup) 的 id
            }
        })
        //获取到视频数据,就关闭加载框
        wx.hideLoading()
        let index = 0;
        let resultData = result.datas.map(item => {
            item.id = index++;
            return item;
        })
        // console.log(resultData);
        this.setData({
            /* videoList */
            videoList: resultData,
            isTriggered: false, //获取到视频数据,关闭下拉刷新
        })
        // console.log(result);
    },

    //点击播放或继续播放的回调
    handlePlay(event) {
        /**
         * 问题:多个视频同时播放的问题
         * 需求:  
         *  1.再点击播放的事件中需要找到上一个播放的视频
         *  2.在播放新的视频之前关闭上一个正在播放的视频
         *  关键点:
         *    1.如何拿到上一个视频的实例对象
         *    2.如何确定点击播放的视频和正在播放的视频不是同一个视频
         * 单例模式:
         *  1.需要创建多个对象的场景下,通过一个变量接收,始终保持只有一个对象
         *  2.节省内存空间
         */

        //video的id,用来表示时哪一个视频
        let vid = event.target.id;
        //关闭上一个播放的视频    
        // this.vid!==vid && this.videoContext && this.videoContext.stop();
        // 没有做(性能优化)图片的时候需要,有了图片不需要了,通过判断解决了
        // if(this.vid!==vid){//1.点击的视频和播放的视频不是同一个
        //   if(this.videoContext){//有了视频实例
        //     this.videoContext.stop();//暂停视频实例
        //   }
        // }
        // this.vid=vid;
        //创建控制video标签的实例对象
        this.videoContext = wx.createVideoContext(vid)

        //更新data中videoId的数据
        this.setData({
            videoId: vid,
        })

        //判断当前的视频之前是否播放过,是否有播放记录,如果有,就跳转到指定的播放位置
        let {
            videoUpdateTime
        } = this.data;
        let videoItem = videoUpdateTime.find(item => {
            return item.vid === vid;
        })
        if (videoItem) {
            this.videoContext.seek(videoItem.currentTime)
        }
    },

    //监听视频播放进度的回调
    headleTimeUpdate(event) {
        // console.log(event);
        let videoTimeObj = {
            vid: event.target.id,
            currentTime: event.detail.currentTime
        }; //vid(视频实例),和播放的时常
        let {
            videoUpdateTime
        } = this.data;
        /**
         *  思路:判断记录播放时长的videoUpdateTime数组中是否有当前视频的播放记录
         *    1.如果有,在原有的播放记录中修改播放时间为当前播放时间
         *    2.如果没有,需要在数组中添加当前视频的播放对象
         * */
        let videoItem = videoUpdateTime.find(item => {
            return item.vid === videoTimeObj.vid //满足条件就返回满足条件的元素
        })
        if (videoItem) { //之前有
            videoItem.currentTime = videoTimeObj.currentTime; //修改满足条件的元素
        } else { //之前没有
            videoUpdateTime.push(videoTimeObj)
        }
        //最终统一更新videoUpdateTime的状态
        this.setData({
            videoUpdateTime: videoUpdateTime,
        })
        // console.log(this.data.videoUpdateTime);
    },

    //视频播放结束的回调
    headleEnded(event) {
        //移除记录播放时长数组中当前视频对象
        let {
            videoUpdateTime
        } = this.data;
        let videoIndex = videoUpdateTime.findIndex(item => {
            item.vid == event.target.id
        })
        videoUpdateTime.splice(videoIndex, 1);
        //删除完更新一下数据
        this.setData({
            videoUpdateTime,
        })
    },

    //自定义下拉刷新的回调: scroll-view
    beadleRefresher() {
        //再次发请求,获取最新视频列表数据
        this.getVideoList(this.data.navActive)
        this.setData({
            isTriggered: true,
        })
    },

    //自定义上拉触底的回调 scroll-view
    bandleToLower() {
        //数据分页: 1.后端分页, 2.前端分页
        // 发送请求 || 在前端截取最新数据,追加到视频列表后方
        //网易云音乐暂时没有提供分页的api

        //使用模拟数据来,模拟上拉加载更多数据
        let newVideoList = [{
                "type": 1,
                "displayed": false,
                "alg": "onlineHotGroup",
                "extAlg": null,
                "data": {
                    "alg": "onlineHotGroup",
                    "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
                    "threadId": "R_VI_62_FFCCCEF1EFD2AA2773F1FA2C93094D54",
                    "coverUrl": "https://p1.music.126.net/s3F0sC-3q8bhCsDfouz_xw==/109951165264563117.jpg",
                    "height": 720,
                    "width": 1280,
                    "title": "Rosé朴彩英solo舞台《someone you loved》日本演唱会",
                    "description": null,
                    "commentCount": 9,
                    "shareCount": 43,
                    "resolutions": [{
                            "resolution": 240,
                            "size": 16091236
                        },
                        {
                            "resolution": 480,
                            "size": 25861493
                        },
                        {
                            "resolution": 720,
                            "size": 38009450
                        }
                    ],
                    "creator": {
                        "defaultAvatar": false,
                        "province": 1000000,
                        "authStatus": 0,
                        "followed": false,
                        "avatarUrl": "http://p1.music.126.net/j5BWk8a5wwGWXlZZH2WOTw==/109951165271385314.jpg",
                        "accountStatus": 0,
                        "gender": 1,
                        "city": 1001300,
                        "birthday": 793814400000,
                        "userId": 109867632,
                        "userType": 204,
                        "nickname": "Jeremiah---",
                        "signature": "",
                        "description": "",
                        "detailDescription": "",
                        "avatarImgId": 109951165271385310,
                        "backgroundImgId": 109951165681194160,
                        "backgroundUrl": "http://p1.music.126.net/H-8sHwdoCahx7kqI-cRJeQ==/109951165681194167.jpg",
                        "authority": 0,
                        "mutual": false,
                        "expertTags": null,
                        "experts": null,
                        "djStatus": 0,
                        "vipType": 0,
                        "remarkName": null,
                        "avatarImgIdStr": "109951165271385314",
                        "backgroundImgIdStr": "109951165681194167",
                        "avatarImgId_str": "109951165271385314"
                    },
                    "urlInfo": {
                        "id": "FFCCCEF1EFD2AA2773F1FA2C93094D54",
                        "url": "http://vodkgeyttp9.vod.126.net/cloudmusic/k2pAABeR_3099200417_shd.mp4?ts=1616406789&rid=A97AA052E5D720A2744256F3C35568AF&rl=3&rs=jzBZDspNNaHzFSvUqlXmjgaTPWfrBKQx&sign=7294927fd3631d0dce0a03e4b6364f8b&ext=yU23RpaV5N2sIcss%2BhUKkIv6OYknLxPlYHDUZmIycbWnBzBZtGvSxxRatqPfHCgaH8lvikXm%2FjE8aWOBYdtkWjRDcWxbdR0qkmAlWB36aGrNJ%2BxOCq%2Biuzc1HgPT8Sk9JJxovL%2BbwZGmdCvmmai3Xa3EmNcrobmiZtEwIZTDZsCW5to8eCD6652AKxZH9gyrVP2WMKgokwgjY7lAgytLZbQTFy%2FDpbOFRgbtfjrNMmxDDKRAqUJ98jVT8GX%2Bo2Br",
                        "size": 38009450,
                        "validityTime": 1200,
                        "needPay": false,
                        "payInfo": null,
                        "r": 720
                    },
                    "videoGroup": [{
                            "id": -8013,
                            "name": "#人气飙升榜#",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 57106,
                            "name": "欧美现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 57110,
                            "name": "饭拍现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 57108,
                            "name": "流行现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 1100,
                            "name": "音乐现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 58100,
                            "name": "现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 5100,
                            "name": "音乐",
                            "alg": "groupTagRank"
                        }
                    ],
                    "previewUrl": null,
                    "previewDurationms": 0,
                    "hasRelatedGameAd": false,
                    "markTypes": null,
                    "relateSong": [{
                        "name": "Someone You Loved",
                        "id": 1469748653,
                        "pst": 0,
                        "t": 0,
                        "ar": [{
                            "id": 12474140,
                            "name": "Lewis Capaldi",
                            "tns": [],
                            "alias": []
                        }],
                        "alia": [],
                        "pop": 100,
                        "st": 0,
                        "rt": "",
                        "fee": 8,
                        "v": 4,
                        "crbt": null,
                        "cf": "",
                        "al": {
                            "id": 93729416,
                            "name": "Romantic Pop Songs",
                            "picUrl": "http://p4.music.126.net/TtO01pTfbqQAz7K4izCRng==/109951165220394493.jpg",
                            "tns": [],
                            "pic_str": "109951165220394493",
                            "pic": 109951165220394500
                        },
                        "dt": 184058,
                        "h": {
                            "br": 320002,
                            "fid": 0,
                            "size": 7363440,
                            "vd": -66714
                        },
                        "m": {
                            "br": 192002,
                            "fid": 0,
                            "size": 4418081,
                            "vd": -64091
                        },
                        "l": {
                            "br": 128002,
                            "fid": 0,
                            "size": 2945402,
                            "vd": -62339
                        },
                        "a": null,
                        "cd": "01",
                        "no": 3,
                        "rtUrl": null,
                        "ftype": 0,
                        "rtUrls": [],
                        "djId": 0,
                        "copyright": 1,
                        "s_id": 0,
                        "rtype": 0,
                        "rurl": null,
                        "mst": 9,
                        "cp": 7003,
                        "mv": 0,
                        "publishTime": 1596988800000,
                        "privilege": {
                            "id": 1469748653,
                            "fee": 8,
                            "payed": 0,
                            "st": 0,
                            "pl": 128000,
                            "dl": 0,
                            "sp": 7,
                            "cp": 1,
                            "subp": 1,
                            "cs": false,
                            "maxbr": 320000,
                            "fl": 128000,
                            "toast": false,
                            "flag": 4,
                            "preSell": false
                        }
                    }],
                    "relatedInfo": null,
                    "videoUserLiveInfo": null,
                    "vid": "FFCCCEF1EFD2AA2773F1FA2C93094D54",
                    "durationms": 174000,
                    "playTime": 59045,
                    "praisedCount": 420,
                    "praised": false,
                    "subscribed": false
                }
            },
            {
                "type": 1,
                "displayed": false,
                "alg": "onlineHotGroup",
                "extAlg": null,
                "data": {
                    "alg": "onlineHotGroup",
                    "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
                    "threadId": "R_VI_62_85D78BFC8F4280BA1A2E49D7346BB46E",
                    "coverUrl": "https://p1.music.126.net/p7IZak51SfiKflkDwy35Ww==/109951163952594480.jpg",
                    "height": 1080,
                    "width": 1920,
                    "title": "当中国rapper站上美国街头表演，看黑人和白人的反应！",
                    "description": "当中国rapper站上美国街头表演，看黑人和白人的反应！《江心寺》 池一骋CHI/Dawa\n（1:28秒后亮了）\n",
                    "commentCount": 4267,
                    "shareCount": 5562,
                    "resolutions": [{
                            "resolution": 240,
                            "size": 109441249
                        },
                        {
                            "resolution": 480,
                            "size": 132206513
                        },
                        {
                            "resolution": 720,
                            "size": 265244869
                        },
                        {
                            "resolution": 1080,
                            "size": 292787760
                        }
                    ],
                    "creator": {
                        "defaultAvatar": false,
                        "province": 1000000,
                        "authStatus": 1,
                        "followed": false,
                        "avatarUrl": "http://p1.music.126.net/jT6mGP7hXGoXRmc9ZIa_NA==/109951164060640030.jpg",
                        "accountStatus": 0,
                        "gender": 1,
                        "city": 1004400,
                        "birthday": 885024000000,
                        "userId": 330816088,
                        "userType": 4,
                        "nickname": "池一骋CHI",
                        "signature": "池一骋，来自温州的说唱歌手，美国说唱厂牌燥堂主理人，明日之子第二季全国18强。",
                        "description": "",
                        "detailDescription": "",
                        "avatarImgId": 109951164060640030,
                        "backgroundImgId": 109951163696522240,
                        "backgroundUrl": "http://p1.music.126.net/hRZGgwFITjOtzxP4gKkg7A==/109951163696522234.jpg",
                        "authority": 0,
                        "mutual": false,
                        "expertTags": null,
                        "experts": {
                            "1": "音乐原创视频达人"
                        },
                        "djStatus": 10,
                        "vipType": 11,
                        "remarkName": null,
                        "avatarImgIdStr": "109951164060640030",
                        "backgroundImgIdStr": "109951163696522234",
                        "avatarImgId_str": "109951164060640030"
                    },
                    "urlInfo": {
                        "id": "85D78BFC8F4280BA1A2E49D7346BB46E",
                        "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/eNv7gAJy_2400622074_uhd.mp4?ts=1616406789&rid=A97AA052E5D720A2744256F3C35568AF&rl=3&rs=JDKeibwCDeQXTUnQQhtRmlVZCPJoEfpt&sign=85572b5c7cc83760fa1da95091125a2d&ext=yU23RpaV5N2sIcss%2BhUKkIv6OYknLxPlYHDUZmIycbWnBzBZtGvSxxRatqPfHCgaH8lvikXm%2FjE8aWOBYdtkWjRDcWxbdR0qkmAlWB36aGrNJ%2BxOCq%2Biuzc1HgPT8Sk9JJxovL%2BbwZGmdCvmmai3Xa3EmNcrobmiZtEwIZTDZsCW5to8eCD6652AKxZH9gyrVP2WMKgokwgjY7lAgytLZbQTFy%2FDpbOFRgbtfjrNMmxDDKRAqUJ98jVT8GX%2Bo2Br",
                        "size": 292787760,
                        "validityTime": 1200,
                        "needPay": false,
                        "payInfo": null,
                        "r": 1080
                    },
                    "videoGroup": [{
                            "id": -8003,
                            "name": "#点赞榜#",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 59106,
                            "name": "街头表演",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 1100,
                            "name": "音乐现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 58100,
                            "name": "现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 5100,
                            "name": "音乐",
                            "alg": "groupTagRank"
                        }
                    ],
                    "previewUrl": null,
                    "previewDurationms": 0,
                    "hasRelatedGameAd": false,
                    "markTypes": null,
                    "relateSong": [{
                        "name": "江心寺",
                        "id": 1349745416,
                        "pst": 0,
                        "t": 0,
                        "ar": [{
                                "id": 13007102,
                                "name": "池一骋",
                                "tns": [],
                                "alias": []
                            },
                            {
                                "id": 29235420,
                                "name": "Dawa",
                                "tns": [],
                                "alias": []
                            }
                        ],
                        "alia": [],
                        "pop": 80,
                        "st": 0,
                        "rt": "",
                        "fee": 8,
                        "v": 6,
                        "crbt": null,
                        "cf": "",
                        "al": {
                            "id": 75752628,
                            "name": "江心寺(Feat. Dawa)",
                            "picUrl": "http://p4.music.126.net/2M76EfsvqmCOVa9RDORq1A==/109951163900733752.jpg",
                            "tns": [],
                            "pic_str": "109951163900733752",
                            "pic": 109951163900733760
                        },
                        "dt": 185000,
                        "h": {
                            "br": 320000,
                            "fid": 0,
                            "size": 7403146,
                            "vd": -2
                        },
                        "m": {
                            "br": 192000,
                            "fid": 0,
                            "size": 4441905,
                            "vd": -2
                        },
                        "l": {
                            "br": 128000,
                            "fid": 0,
                            "size": 2961284,
                            "vd": -1
                        },
                        "a": null,
                        "cd": "01",
                        "no": 1,
                        "rtUrl": null,
                        "ftype": 0,
                        "rtUrls": [],
                        "djId": 0,
                        "copyright": 0,
                        "s_id": 0,
                        "rtype": 0,
                        "rurl": null,
                        "mst": 9,
                        "cp": 0,
                        "mv": 0,
                        "publishTime": 0,
                        "privilege": {
                            "id": 1349745416,
                            "fee": 8,
                            "payed": 0,
                            "st": 0,
                            "pl": 128000,
                            "dl": 0,
                            "sp": 7,
                            "cp": 1,
                            "subp": 1,
                            "cs": false,
                            "maxbr": 999000,
                            "fl": 128000,
                            "toast": false,
                            "flag": 0,
                            "preSell": false
                        }
                    }],
                    "relatedInfo": null,
                    "videoUserLiveInfo": null,
                    "vid": "85D78BFC8F4280BA1A2E49D7346BB46E",
                    "durationms": 299724,
                    "playTime": 10134601,
                    "praisedCount": 54512,
                    "praised": false,
                    "subscribed": false
                }
            },
            {
                "type": 1,
                "displayed": false,
                "alg": "onlineHotGroup",
                "extAlg": null,
                "data": {
                    "alg": "onlineHotGroup",
                    "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
                    "threadId": "R_VI_62_AB5CD88516410325812FF8940372F78C",
                    "coverUrl": "https://p1.music.126.net/ez-LDSCAQGqaqSwrh7oOPQ==/109951165371116653.jpg",
                    "height": 360,
                    "width": 642,
                    "title": "王杰唱歌到底有多好听？来听听早年他和齐秦pk",
                    "description": "",
                    "commentCount": 1587,
                    "shareCount": 2944,
                    "resolutions": [{
                        "resolution": 240,
                        "size": 17618813
                    }],
                    "creator": {
                        "defaultAvatar": false,
                        "province": 340000,
                        "authStatus": 0,
                        "followed": false,
                        "avatarUrl": "http://p1.music.126.net/wlC7a5VUE47Vh3ycwGYsSQ==/18749971790193116.jpg",
                        "accountStatus": 0,
                        "gender": 1,
                        "city": 340100,
                        "birthday": 628704000000,
                        "userId": 339174537,
                        "userType": 204,
                        "nickname": "悟空音乐随笔",
                        "signature": "",
                        "description": "",
                        "detailDescription": "",
                        "avatarImgId": 18749971790193116,
                        "backgroundImgId": 2002210674180203,
                        "backgroundUrl": "http://p1.music.126.net/bmA_ablsXpq3Tk9HlEg9sA==/2002210674180203.jpg",
                        "authority": 0,
                        "mutual": false,
                        "expertTags": null,
                        "experts": {
                            "1": "音乐视频达人",
                            "2": "华语音乐资讯达人"
                        },
                        "djStatus": 0,
                        "vipType": 0,
                        "remarkName": null,
                        "avatarImgIdStr": "18749971790193116",
                        "backgroundImgIdStr": "2002210674180203",
                        "avatarImgId_str": "18749971790193116"
                    },
                    "urlInfo": {
                        "id": "AB5CD88516410325812FF8940372F78C",
                        "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/UaRGLdLV_138430419_sd.mp4?ts=1616406789&rid=A97AA052E5D720A2744256F3C35568AF&rl=3&rs=JVLhMlXbcAtGwJXXIqrmbcewhPwLuApM&sign=d21ec59b1aaa9922bd346d7299f63f18&ext=yU23RpaV5N2sIcss%2BhUKkIv6OYknLxPlYHDUZmIycbWnBzBZtGvSxxRatqPfHCgaH8lvikXm%2FjE8aWOBYdtkWjRDcWxbdR0qkmAlWB36aGrNJ%2BxOCq%2Biuzc1HgPT8Sk9JJxovL%2BbwZGmdCvmmai3Xa3EmNcrobmiZtEwIZTDZsCW5to8eCD6652AKxZH9gyrVP2WMKgokwgjY7lAgytLZbQTFy%2FDpbOFRgbtfjrNMmxsmvCiKtLF5nSiQvXXxpl0",
                        "size": 17618813,
                        "validityTime": 1200,
                        "needPay": false,
                        "payInfo": null,
                        "r": 240
                    },
                    "videoGroup": [{
                            "id": -8004,
                            "name": "#评论榜#",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 3101,
                            "name": "综艺",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 4101,
                            "name": "娱乐",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 1100,
                            "name": "音乐现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 58100,
                            "name": "现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 5100,
                            "name": "音乐",
                            "alg": "groupTagRank"
                        }
                    ],
                    "previewUrl": null,
                    "previewDurationms": 0,
                    "hasRelatedGameAd": false,
                    "markTypes": [
                        109
                    ],
                    "relateSong": [{
                        "name": "一场游戏一场梦",
                        "id": 157808,
                        "pst": 0,
                        "t": 0,
                        "ar": [{
                            "id": 5358,
                            "name": "王杰",
                            "tns": [],
                            "alias": []
                        }],
                        "alia": [],
                        "pop": 95,
                        "st": 0,
                        "rt": "600902000005313003",
                        "fee": 1,
                        "v": 29,
                        "crbt": null,
                        "cf": "",
                        "al": {
                            "id": 15868,
                            "name": "浪子心",
                            "picUrl": "http://p3.music.126.net/BI9AKm0M1tWNQQcBuBZSJQ==/17738421091339720.jpg",
                            "tns": [],
                            "pic_str": "17738421091339720",
                            "pic": 17738421091339720
                        },
                        "dt": 257333,
                        "h": {
                            "br": 320000,
                            "fid": 0,
                            "size": 10296468,
                            "vd": 10512
                        },
                        "m": {
                            "br": 192000,
                            "fid": 0,
                            "size": 6177898,
                            "vd": 13123
                        },
                        "l": {
                            "br": 128000,
                            "fid": 0,
                            "size": 4118613,
                            "vd": 14763
                        },
                        "a": null,
                        "cd": "1",
                        "no": 1,
                        "rtUrl": null,
                        "ftype": 0,
                        "rtUrls": [],
                        "djId": 0,
                        "copyright": 1,
                        "s_id": 0,
                        "rtype": 0,
                        "rurl": null,
                        "mst": 9,
                        "cp": 7002,
                        "mv": 0,
                        "publishTime": 749404800000,
                        "privilege": {
                            "id": 157808,
                            "fee": 1,
                            "payed": 0,
                            "st": 0,
                            "pl": 0,
                            "dl": 0,
                            "sp": 0,
                            "cp": 0,
                            "subp": 0,
                            "cs": false,
                            "maxbr": 999000,
                            "fl": 0,
                            "toast": false,
                            "flag": 1028,
                            "preSell": false
                        }
                    }],
                    "relatedInfo": null,
                    "videoUserLiveInfo": null,
                    "vid": "AB5CD88516410325812FF8940372F78C",
                    "durationms": 197160,
                    "playTime": 1356113,
                    "praisedCount": 8785,
                    "praised": false,
                    "subscribed": false
                }
            },
            {
                "type": 1,
                "displayed": false,
                "alg": "onlineHotGroup",
                "extAlg": null,
                "data": {
                    "alg": "onlineHotGroup",
                    "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
                    "threadId": "R_VI_62_70760AA9A3AEB93AF274B07DB97D9E70",
                    "coverUrl": "https://p1.music.126.net/yVS6ymF1FB-WxsbncXmL4A==/109951164017627621.jpg",
                    "height": 720,
                    "width": 1280,
                    "title": "薛之谦和大张伟对唱《意外》,有多不正经就有多深情!",
                    "description": "薛之谦和大张伟对唱《意外》,有多不正经就有多深情!",
                    "commentCount": 1361,
                    "shareCount": 2844,
                    "resolutions": [{
                            "resolution": 240,
                            "size": 31707485
                        },
                        {
                            "resolution": 480,
                            "size": 61376610
                        },
                        {
                            "resolution": 720,
                            "size": 70529821
                        }
                    ],
                    "creator": {
                        "defaultAvatar": false,
                        "province": 330000,
                        "authStatus": 0,
                        "followed": false,
                        "avatarUrl": "http://p1.music.126.net/J5cmHMDOVNaQMuNES4MPQA==/109951164501912244.jpg",
                        "accountStatus": 0,
                        "gender": 2,
                        "city": 330100,
                        "birthday": 755712000000,
                        "userId": 1289603861,
                        "userType": 204,
                        "nickname": "音乐观察员",
                        "signature": "流行、经典、民谣音乐爱好者~",
                        "description": "",
                        "detailDescription": "",
                        "avatarImgId": 109951164501912240,
                        "backgroundImgId": 109951164677064240,
                        "backgroundUrl": "http://p1.music.126.net/Cce9JhhHmkGuVTJtP8HbsQ==/109951164677064241.jpg",
                        "authority": 0,
                        "mutual": false,
                        "expertTags": null,
                        "experts": {
                            "1": "视频达人(华语、音乐现场)",
                            "2": "音乐图文达人"
                        },
                        "djStatus": 0,
                        "vipType": 0,
                        "remarkName": null,
                        "avatarImgIdStr": "109951164501912244",
                        "backgroundImgIdStr": "109951164677064241",
                        "avatarImgId_str": "109951164501912244"
                    },
                    "urlInfo": {
                        "id": "70760AA9A3AEB93AF274B07DB97D9E70",
                        "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/D4PXWInV_2460437699_shd.mp4?ts=1616406789&rid=A97AA052E5D720A2744256F3C35568AF&rl=3&rs=rkpEsSpInSituLpxDcwmadnBidhSdeVF&sign=5d0385a214b08f5a72f7b65b18d10372&ext=yU23RpaV5N2sIcss%2BhUKkIv6OYknLxPlYHDUZmIycbWnBzBZtGvSxxRatqPfHCgaH8lvikXm%2FjE8aWOBYdtkWjRDcWxbdR0qkmAlWB36aGrNJ%2BxOCq%2Biuzc1HgPT8Sk9JJxovL%2BbwZGmdCvmmai3Xa3EmNcrobmiZtEwIZTDZsCW5to8eCD6652AKxZH9gyrVP2WMKgokwgjY7lAgytLZbQTFy%2FDpbOFRgbtfjrNMmxDDKRAqUJ98jVT8GX%2Bo2Br",
                        "size": 70529821,
                        "validityTime": 1200,
                        "needPay": false,
                        "payInfo": null,
                        "r": 720
                    },
                    "videoGroup": [{
                            "id": -8003,
                            "name": "#点赞榜#",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 24129,
                            "name": "薛之谦",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 59101,
                            "name": "华语现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 57108,
                            "name": "流行现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 1100,
                            "name": "音乐现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 58100,
                            "name": "现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 5100,
                            "name": "音乐",
                            "alg": "groupTagRank"
                        }
                    ],
                    "previewUrl": null,
                    "previewDurationms": 0,
                    "hasRelatedGameAd": false,
                    "markTypes": null,
                    "relateSong": [{
                        "name": "意外",
                        "id": 27890306,
                        "pst": 0,
                        "t": 0,
                        "ar": [{
                            "id": 5781,
                            "name": "薛之谦",
                            "tns": [],
                            "alias": []
                        }],
                        "alia": [],
                        "pop": 100,
                        "st": 0,
                        "rt": "600907000002830296",
                        "fee": 8,
                        "v": 39,
                        "crbt": null,
                        "cf": "",
                        "al": {
                            "id": 2681139,
                            "name": "意外",
                            "picUrl": "http://p3.music.126.net/WPHmBisDxnoF4DrBLKwl3Q==/109951163169021112.jpg",
                            "tns": [],
                            "pic_str": "109951163169021112",
                            "pic": 109951163169021120
                        },
                        "dt": 287000,
                        "h": {
                            "br": 320000,
                            "fid": 0,
                            "size": 11500190,
                            "vd": -21700
                        },
                        "m": {
                            "br": 192000,
                            "fid": 0,
                            "size": 6900131,
                            "vd": -19200
                        },
                        "l": {
                            "br": 128000,
                            "fid": 0,
                            "size": 4600101,
                            "vd": -17700
                        },
                        "a": null,
                        "cd": "1",
                        "no": 2,
                        "rtUrl": null,
                        "ftype": 0,
                        "rtUrls": [],
                        "djId": 0,
                        "copyright": 1,
                        "s_id": 0,
                        "rtype": 0,
                        "rurl": null,
                        "mst": 9,
                        "cp": 29001,
                        "mv": 5309397,
                        "publishTime": 1381161600007,
                        "privilege": {
                            "id": 27890306,
                            "fee": 8,
                            "payed": 0,
                            "st": 0,
                            "pl": 128000,
                            "dl": 0,
                            "sp": 7,
                            "cp": 1,
                            "subp": 1,
                            "cs": false,
                            "maxbr": 999000,
                            "fl": 128000,
                            "toast": false,
                            "flag": 260,
                            "preSell": false
                        }
                    }],
                    "relatedInfo": null,
                    "videoUserLiveInfo": null,
                    "vid": "70760AA9A3AEB93AF274B07DB97D9E70",
                    "durationms": 259327,
                    "playTime": 3841969,
                    "praisedCount": 29340,
                    "praised": false,
                    "subscribed": false
                }
            },
            {
                "type": 1,
                "displayed": false,
                "alg": "onlineHotGroup",
                "extAlg": null,
                "data": {
                    "alg": "onlineHotGroup",
                    "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
                    "threadId": "R_VI_62_ECF29481B5D286776C9728BDCCB3DA4F",
                    "coverUrl": "https://p1.music.126.net/DkcNA1ERlOzzx5V3D3QjTw==/109951163043761349.jpg",
                    "height": 720,
                    "width": 1280,
                    "title": "《曾经的你》许巍最燃的一个现场版本，李延亮也帅炸了",
                    "description": "《曾经的你》许巍最燃的一个现场版本，李延亮也帅炸了，许巍的歌总是很直接，不拐弯抹角直击心底",
                    "commentCount": 3986,
                    "shareCount": 15705,
                    "resolutions": [{
                            "resolution": 240,
                            "size": 18126293
                        },
                        {
                            "resolution": 480,
                            "size": 39055786
                        },
                        {
                            "resolution": 720,
                            "size": 70290507
                        }
                    ],
                    "creator": {
                        "defaultAvatar": false,
                        "province": 440000,
                        "authStatus": 0,
                        "followed": false,
                        "avatarUrl": "http://p1.music.126.net/ISYw2b6t1ZrJn4ln-eDOWw==/109951163099991417.jpg",
                        "accountStatus": 0,
                        "gender": 2,
                        "city": 440100,
                        "birthday": 843148800000,
                        "userId": 381268157,
                        "userType": 0,
                        "nickname": "热点音乐HeatsMusic",
                        "signature": "分享点音乐，偶尔怀旧。",
                        "description": "",
                        "detailDescription": "",
                        "avatarImgId": 109951163099991420,
                        "backgroundImgId": 109951163030912370,
                        "backgroundUrl": "http://p1.music.126.net/fDxOUzoFYrM3rNYQiEbLjA==/109951163030912368.jpg",
                        "authority": 0,
                        "mutual": false,
                        "expertTags": null,
                        "experts": {
                            "1": "音乐视频达人"
                        },
                        "djStatus": 0,
                        "vipType": 0,
                        "remarkName": null,
                        "avatarImgIdStr": "109951163099991417",
                        "backgroundImgIdStr": "109951163030912368",
                        "avatarImgId_str": "109951163099991417"
                    },
                    "urlInfo": {
                        "id": "ECF29481B5D286776C9728BDCCB3DA4F",
                        "url": "http://vodkgeyttp9.vod.126.net/cloudmusic/cc73e6b64f282c3072f7f6458dcc3374.mp4?ts=1616406789&rid=A97AA052E5D720A2744256F3C35568AF&rl=3&rs=uevBjIRrdhTpkLCAIrLUeegJINDgAnwg&sign=d27127a50153850e95eb943696b08bac&ext=yU23RpaV5N2sIcss%2BhUKkIv6OYknLxPlYHDUZmIycbWnBzBZtGvSxxRatqPfHCgaH8lvikXm%2FjE8aWOBYdtkWjRDcWxbdR0qkmAlWB36aGrNJ%2BxOCq%2Biuzc1HgPT8Sk9JJxovL%2BbwZGmdCvmmai3Xa3EmNcrobmiZtEwIZTDZsCW5to8eCD6652AKxZH9gyrVP2WMKgokwgjY7lAgytLZbQTFy%2FDpbOFRgbtfjrNMmxeewxskMfNBvc1dExQGbtm",
                        "size": 70290507,
                        "validityTime": 1200,
                        "needPay": false,
                        "payInfo": null,
                        "r": 720
                    },
                    "videoGroup": [{
                            "id": -8004,
                            "name": "#评论榜#",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 13223,
                            "name": "许巍",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 16201,
                            "name": "温暖",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 13222,
                            "name": "华语",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 4105,
                            "name": "摇滚",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 24134,
                            "name": "弹唱",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 16170,
                            "name": "吉他",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 1100,
                            "name": "音乐现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 58100,
                            "name": "现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 5100,
                            "name": "音乐",
                            "alg": "groupTagRank"
                        }
                    ],
                    "previewUrl": null,
                    "previewDurationms": 0,
                    "hasRelatedGameAd": false,
                    "markTypes": null,
                    "relateSong": [{
                        "name": "曾经的你",
                        "id": 167804,
                        "pst": 0,
                        "t": 0,
                        "ar": [{
                            "id": 5770,
                            "name": "许巍",
                            "tns": [],
                            "alias": []
                        }],
                        "alia": [],
                        "pop": 100,
                        "st": 0,
                        "rt": "600902000001024133",
                        "fee": 1,
                        "v": 38,
                        "crbt": null,
                        "cf": "",
                        "al": {
                            "id": 16946,
                            "name": "曾经的你",
                            "picUrl": "http://p4.music.126.net/OHzbyGhLdNatFNExPNkD4Q==/6670737045790111.jpg",
                            "tns": [],
                            "pic": 6670737045790111
                        },
                        "dt": 261000,
                        "h": {
                            "br": 320000,
                            "fid": 0,
                            "size": 10459598,
                            "vd": 71
                        },
                        "m": {
                            "br": 192000,
                            "fid": 0,
                            "size": 6275827,
                            "vd": -2
                        },
                        "l": {
                            "br": 128000,
                            "fid": 0,
                            "size": 4183941,
                            "vd": 0
                        },
                        "a": null,
                        "cd": "1",
                        "no": 3,
                        "rtUrl": null,
                        "ftype": 0,
                        "rtUrls": [],
                        "djId": 0,
                        "copyright": 0,
                        "s_id": 0,
                        "rtype": 0,
                        "rurl": null,
                        "mst": 9,
                        "cp": 13009,
                        "mv": 5300126,
                        "publishTime": 1157040000000,
                        "privilege": {
                            "id": 167804,
                            "fee": 1,
                            "payed": 0,
                            "st": 0,
                            "pl": 0,
                            "dl": 0,
                            "sp": 0,
                            "cp": 0,
                            "subp": 0,
                            "cs": false,
                            "maxbr": 999000,
                            "fl": 0,
                            "toast": false,
                            "flag": 1028,
                            "preSell": false
                        }
                    }],
                    "relatedInfo": null,
                    "videoUserLiveInfo": null,
                    "vid": "ECF29481B5D286776C9728BDCCB3DA4F",
                    "durationms": 391787,
                    "playTime": 5423061,
                    "praisedCount": 41192,
                    "praised": false,
                    "subscribed": false
                }
            },
            {
                "type": 1,
                "displayed": false,
                "alg": "onlineHotGroup",
                "extAlg": null,
                "data": {
                    "alg": "onlineHotGroup",
                    "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
                    "threadId": "R_VI_62_7CF362DE3F8492D8C6C4D881FDEA373C",
                    "coverUrl": "https://p1.music.126.net/OiGdueL0_IVduE3-GSY9kA==/109951165094029548.jpg",
                    "height": 1080,
                    "width": 1920,
                    "title": "当网红受邀参加歌唱比赛，舞台表现丝毫不逊色专业歌手！",
                    "description": "赵方倩《芒种》\n冯提莫《世间美好与你环环相扣》\n戴羽彤《那个女孩对我说》\n韩甜甜《飞云之下》\n当网红受邀参加歌唱比赛！",
                    "commentCount": 89,
                    "shareCount": 45,
                    "resolutions": [{
                            "resolution": 240,
                            "size": 28788811
                        },
                        {
                            "resolution": 480,
                            "size": 49497228
                        },
                        {
                            "resolution": 720,
                            "size": 73774767
                        },
                        {
                            "resolution": 1080,
                            "size": 144664395
                        }
                    ],
                    "creator": {
                        "defaultAvatar": false,
                        "province": 510000,
                        "authStatus": 0,
                        "followed": false,
                        "avatarUrl": "http://p1.music.126.net/88cl9b_PeNMUzmGCzRaEZw==/18758767883204803.jpg",
                        "accountStatus": 0,
                        "gender": 1,
                        "city": 510500,
                        "birthday": -2209017600000,
                        "userId": 394604291,
                        "userType": 204,
                        "nickname": "so-旧梦",
                        "signature": "",
                        "description": "",
                        "detailDescription": "",
                        "avatarImgId": 18758767883204804,
                        "backgroundImgId": 2002210674180202,
                        "backgroundUrl": "http://p1.music.126.net/pmHS4fcQtcNEGewNb5HRhg==/2002210674180202.jpg",
                        "authority": 0,
                        "mutual": false,
                        "expertTags": null,
                        "experts": {
                            "1": "超燃联盟视频达人"
                        },
                        "djStatus": 0,
                        "vipType": 11,
                        "remarkName": null,
                        "avatarImgIdStr": "18758767883204803",
                        "backgroundImgIdStr": "2002210674180202",
                        "avatarImgId_str": "18758767883204803"
                    },
                    "urlInfo": {
                        "id": "7CF362DE3F8492D8C6C4D881FDEA373C",
                        "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/mTgyKYOW_3039006881_uhd.mp4?ts=1616406789&rid=A97AA052E5D720A2744256F3C35568AF&rl=3&rs=PbkrHeZYZCPtOaqZGxLTfxEbpDZrIVkZ&sign=e1ce3f352c72e24341813604bf4926a8&ext=yU23RpaV5N2sIcss%2BhUKkIv6OYknLxPlYHDUZmIycbWnBzBZtGvSxxRatqPfHCgaH8lvikXm%2FjE8aWOBYdtkWjRDcWxbdR0qkmAlWB36aGrNJ%2BxOCq%2Biuzc1HgPT8Sk9JJxovL%2BbwZGmdCvmmai3Xa3EmNcrobmiZtEwIZTDZsCW5to8eCD6652AKxZH9gyrVP2WMKgokwgjY7lAgytLZbQTFy%2FDpbOFRgbtfjrNMmxsmvCiKtLF5nSiQvXXxpl0",
                        "size": 144664395,
                        "validityTime": 1200,
                        "needPay": false,
                        "payInfo": null,
                        "r": 1080
                    },
                    "videoGroup": [{
                            "id": -8006,
                            "name": "#分享榜#",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 12111,
                            "name": "冯提莫",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 3101,
                            "name": "综艺",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 4101,
                            "name": "娱乐",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 58100,
                            "name": "现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 5100,
                            "name": "音乐",
                            "alg": "groupTagRank"
                        }
                    ],
                    "previewUrl": null,
                    "previewDurationms": 0,
                    "hasRelatedGameAd": false,
                    "markTypes": null,
                    "relateSong": [{
                        "name": "芒种",
                        "id": 1369798757,
                        "pst": 0,
                        "t": 0,
                        "ar": [{
                                "id": 12174521,
                                "name": "音阙诗听",
                                "tns": [],
                                "alias": []
                            },
                            {
                                "id": 12023202,
                                "name": "赵方婧",
                                "tns": [],
                                "alias": []
                            }
                        ],
                        "alia": [],
                        "pop": 100,
                        "st": 0,
                        "rt": "",
                        "fee": 8,
                        "v": 91,
                        "crbt": null,
                        "cf": "",
                        "al": {
                            "id": 87547851,
                            "name": "二十四节气",
                            "picUrl": "http://p3.music.126.net/KFWbxh1ZLyy9WR77Ca08tA==/109951164866828786.jpg",
                            "tns": [],
                            "pic_str": "109951164866828786",
                            "pic": 109951164866828780
                        },
                        "dt": 216000,
                        "h": {
                            "br": 320000,
                            "fid": 0,
                            "size": 8642395,
                            "vd": -41821
                        },
                        "m": {
                            "br": 192000,
                            "fid": 0,
                            "size": 5185454,
                            "vd": -39210
                        },
                        "l": {
                            "br": 128000,
                            "fid": 0,
                            "size": 3456984,
                            "vd": -37485
                        },
                        "a": null,
                        "cd": "01",
                        "no": 9,
                        "rtUrl": null,
                        "ftype": 0,
                        "rtUrls": [],
                        "djId": 0,
                        "copyright": 0,
                        "s_id": 0,
                        "rtype": 0,
                        "rurl": null,
                        "mst": 9,
                        "cp": 1416678,
                        "mv": 10908001,
                        "publishTime": 0,
                        "privilege": {
                            "id": 1369798757,
                            "fee": 8,
                            "payed": 0,
                            "st": 0,
                            "pl": 128000,
                            "dl": 0,
                            "sp": 7,
                            "cp": 1,
                            "subp": 1,
                            "cs": false,
                            "maxbr": 999000,
                            "fl": 128000,
                            "toast": false,
                            "flag": 6,
                            "preSell": false
                        }
                    }],
                    "relatedInfo": null,
                    "videoUserLiveInfo": null,
                    "vid": "7CF362DE3F8492D8C6C4D881FDEA373C",
                    "durationms": 249024,
                    "playTime": 422785,
                    "praisedCount": 2134,
                    "praised": false,
                    "subscribed": false
                }
            },
            {
                "type": 1,
                "displayed": false,
                "alg": "onlineHotGroup",
                "extAlg": null,
                "data": {
                    "alg": "onlineHotGroup",
                    "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
                    "threadId": "R_VI_62_2ECFBFC02440C7BF84BC83AF637ACE4E",
                    "coverUrl": "https://p1.music.126.net/gax3FlvmFsYYsXcVOsG3_Q==/109951165353772705.jpg",
                    "height": 360,
                    "width": 480,
                    "title": "这才是王杰原来的声音，为杰哥祈祷，声音早日康复。",
                    "description": "这才是王杰原来的声音，为杰哥祈祷，声音早日康复。",
                    "commentCount": 674,
                    "shareCount": 1366,
                    "resolutions": [{
                        "resolution": 240,
                        "size": 6958433
                    }],
                    "creator": {
                        "defaultAvatar": false,
                        "province": 330000,
                        "authStatus": 1,
                        "followed": false,
                        "avatarUrl": "http://p1.music.126.net/NyE3ZaBBa4q1uTRycso9jQ==/109951164200929365.jpg",
                        "accountStatus": 0,
                        "gender": 1,
                        "city": 330100,
                        "birthday": 581526000000,
                        "userId": 74474,
                        "userType": 4,
                        "nickname": "葱_music",
                        "signature": "音乐一窍不通，仅是喜欢。",
                        "description": "",
                        "detailDescription": "",
                        "avatarImgId": 109951164200929360,
                        "backgroundImgId": 109951163339122270,
                        "backgroundUrl": "http://p1.music.126.net/C7sUbNgRxYvgDVOSA8ZcjQ==/109951163339122274.jpg",
                        "authority": 0,
                        "mutual": false,
                        "expertTags": null,
                        "experts": {
                            "1": "音乐视频达人",
                            "2": "生活图文达人"
                        },
                        "djStatus": 10,
                        "vipType": 11,
                        "remarkName": null,
                        "avatarImgIdStr": "109951164200929365",
                        "backgroundImgIdStr": "109951163339122274",
                        "avatarImgId_str": "109951164200929365"
                    },
                    "urlInfo": {
                        "id": "2ECFBFC02440C7BF84BC83AF637ACE4E",
                        "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/knmcgDqK_128092819_sd.mp4?ts=1616406789&rid=A97AA052E5D720A2744256F3C35568AF&rl=3&rs=aabSMadXUvyzVmIGQzZfuydeWPbMjZau&sign=a2b69b81636673570db7b9ca7f56622a&ext=yU23RpaV5N2sIcss%2BhUKkIv6OYknLxPlYHDUZmIycbWnBzBZtGvSxxRatqPfHCgaH8lvikXm%2FjE8aWOBYdtkWjRDcWxbdR0qkmAlWB36aGrNJ%2BxOCq%2Biuzc1HgPT8Sk9JJxovL%2BbwZGmdCvmmai3Xa3EmNcrobmiZtEwIZTDZsCW5to8eCD6652AKxZH9gyrVP2WMKgokwgjY7lAgytLZbQTFy%2FDpbOFRgbtfjrNMmxsmvCiKtLF5nSiQvXXxpl0",
                        "size": 6958433,
                        "validityTime": 1200,
                        "needPay": false,
                        "payInfo": null,
                        "r": 240
                    },
                    "videoGroup": [{
                            "id": -8013,
                            "name": "#人气飙升榜#",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 59101,
                            "name": "华语现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 16201,
                            "name": "温暖",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 57108,
                            "name": "流行现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 1100,
                            "name": "音乐现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 58100,
                            "name": "现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 5100,
                            "name": "音乐",
                            "alg": "groupTagRank"
                        }
                    ],
                    "previewUrl": null,
                    "previewDurationms": 0,
                    "hasRelatedGameAd": false,
                    "markTypes": [
                        109
                    ],
                    "relateSong": [{
                        "name": "祈祷",
                        "id": 301947,
                        "pst": 0,
                        "t": 0,
                        "ar": [{
                                "id": 9657,
                                "name": "王韵婵",
                                "tns": [],
                                "alias": []
                            },
                            {
                                "id": 5358,
                                "name": "王杰",
                                "tns": [],
                                "alias": []
                            }
                        ],
                        "alia": [],
                        "pop": 100,
                        "st": 0,
                        "rt": "",
                        "fee": 8,
                        "v": 15,
                        "crbt": null,
                        "cf": "",
                        "al": {
                            "id": 29911,
                            "name": "祈祷",
                            "picUrl": "http://p3.music.126.net/Cxe8i6l2TePK9Fb4rrsC_A==/109951163611525216.jpg",
                            "tns": [],
                            "pic_str": "109951163611525216",
                            "pic": 109951163611525220
                        },
                        "dt": 270000,
                        "h": {
                            "br": 320000,
                            "fid": 0,
                            "size": 10826506,
                            "vd": -0.000265076
                        },
                        "m": {
                            "br": 160000,
                            "fid": 0,
                            "size": 5426474,
                            "vd": 0.266202
                        },
                        "l": {
                            "br": 96000,
                            "fid": 0,
                            "size": 3266043,
                            "vd": 0.113665
                        },
                        "a": null,
                        "cd": "1",
                        "no": 7,
                        "rtUrl": null,
                        "ftype": 0,
                        "rtUrls": [],
                        "djId": 0,
                        "copyright": 1,
                        "s_id": 0,
                        "rtype": 0,
                        "rurl": null,
                        "mst": 9,
                        "cp": 7002,
                        "mv": 5309077,
                        "publishTime": 752083200000,
                        "privilege": {
                            "id": 301947,
                            "fee": 8,
                            "payed": 0,
                            "st": 0,
                            "pl": 128000,
                            "dl": 0,
                            "sp": 7,
                            "cp": 1,
                            "subp": 1,
                            "cs": false,
                            "maxbr": 320000,
                            "fl": 128000,
                            "toast": false,
                            "flag": 0,
                            "preSell": false
                        }
                    }],
                    "relatedInfo": null,
                    "videoUserLiveInfo": null,
                    "vid": "2ECFBFC02440C7BF84BC83AF637ACE4E",
                    "durationms": 73165,
                    "playTime": 1414816,
                    "praisedCount": 7536,
                    "praised": false,
                    "subscribed": false
                }
            },
            {
                "type": 1,
                "displayed": false,
                "alg": "onlineHotGroup",
                "extAlg": null,
                "data": {
                    "alg": "onlineHotGroup",
                    "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
                    "threadId": "R_VI_62_15F2D043BDA37897E37C5D0AEAF9983A",
                    "coverUrl": "https://p1.music.126.net/g4neer9IZovooSVgmesRKA==/109951164812344966.jpg",
                    "height": 720,
                    "width": 1280,
                    "title": "12岁女孩DissBattle让对手惊掉下巴",
                    "description": "",
                    "commentCount": 341,
                    "shareCount": 1137,
                    "resolutions": [{
                            "resolution": 240,
                            "size": 19119438
                        },
                        {
                            "resolution": 480,
                            "size": 32538081
                        },
                        {
                            "resolution": 720,
                            "size": 45223566
                        }
                    ],
                    "creator": {
                        "defaultAvatar": false,
                        "province": 500000,
                        "authStatus": 0,
                        "followed": false,
                        "avatarUrl": "http://p1.music.126.net/4K8f4Lpvi8PlbUybtZSL-A==/109951164810367168.jpg",
                        "accountStatus": 0,
                        "gender": 2,
                        "city": 500101,
                        "birthday": -2209017600000,
                        "userId": 1443582368,
                        "userType": 0,
                        "nickname": "Beloved0907",
                        "signature": "",
                        "description": "",
                        "detailDescription": "",
                        "avatarImgId": 109951164810367170,
                        "backgroundImgId": 109951162868126480,
                        "backgroundUrl": "http://p1.music.126.net/_f8R60U9mZ42sSNvdPn2sQ==/109951162868126486.jpg",
                        "authority": 0,
                        "mutual": false,
                        "expertTags": null,
                        "experts": {
                            "1": "音乐视频达人"
                        },
                        "djStatus": 10,
                        "vipType": 11,
                        "remarkName": null,
                        "avatarImgIdStr": "109951164810367168",
                        "backgroundImgIdStr": "109951162868126486",
                        "avatarImgId_str": "109951164810367168"
                    },
                    "urlInfo": {
                        "id": "15F2D043BDA37897E37C5D0AEAF9983A",
                        "url": "http://vodkgeyttp9.vod.126.net/cloudmusic/mLbdHD4s_2942015730_shd.mp4?ts=1616406789&rid=A97AA052E5D720A2744256F3C35568AF&rl=3&rs=RQVBEVobPvnmNOzePeDOcQQSYfwiaQdv&sign=ef7c68d4dd671f63057e610c8e2a53e5&ext=yU23RpaV5N2sIcss%2BhUKkIv6OYknLxPlYHDUZmIycbWnBzBZtGvSxxRatqPfHCgaH8lvikXm%2FjE8aWOBYdtkWjRDcWxbdR0qkmAlWB36aGrNJ%2BxOCq%2Biuzc1HgPT8Sk9JJxovL%2BbwZGmdCvmmai3Xa3EmNcrobmiZtEwIZTDZsCW5to8eCD6652AKxZH9gyrVP2WMKgokwgjY7lAgytLZbQTFy%2FDpbOFRgbtfjrNMmxDDKRAqUJ98jVT8GX%2Bo2Br",
                        "size": 45223566,
                        "validityTime": 1200,
                        "needPay": false,
                        "payInfo": null,
                        "r": 720
                    },
                    "videoGroup": [{
                            "id": 57105,
                            "name": "粤语现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 57106,
                            "name": "欧美现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 59108,
                            "name": "巡演现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 1100,
                            "name": "音乐现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 58100,
                            "name": "现场",
                            "alg": "groupTagRank"
                        },
                        {
                            "id": 5100,
                            "name": "音乐",
                            "alg": "groupTagRank"
                        }
                    ],
                    "previewUrl": null,
                    "previewDurationms": 0,
                    "hasRelatedGameAd": false,
                    "markTypes": null,
                    "relateSong": [],
                    "relatedInfo": null,
                    "videoUserLiveInfo": null,
                    "vid": "15F2D043BDA37897E37C5D0AEAF9983A",
                    "durationms": 131000,
                    "playTime": 1955486,
                    "praisedCount": 15889,
                    "praised": false,
                    "subscribed": false
                }
            }
        ];
        let videoList = this.data.videoList;
        //将最新的视频数据更新到原有的视频列表中
        videoList.push(...newVideoList)
        this.setData({
            videoList,
        })
    },

    //跳转到搜索页
    toSearch(){
        console.log('a');
        wx.switchTab({
          url: '/pages/search/search',
        })
    },


    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {
        console.log('页面下拉刷新');
    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {
        console.log('页面的上拉触底');
    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function ({
        from
    }) {
        // console.log(from);//button：页面内转发按钮；menu：右上角转发菜单

        if (from == 'button') {
            return {
                title: "来自button的转发",
                path: "/pages/video/video",
                // imageUrl: "/static/images/nvsheng.jpg"
            }
        } else {
            return {
                title: "来自右上角的转发",
                path: "/pages/video/video",
                imageUrl: "/static/images/nvsheng.jpg"
            }
        }

    }
})