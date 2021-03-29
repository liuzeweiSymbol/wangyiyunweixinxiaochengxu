//引入封装好的request组件
import request from '../../utils/request'
Page({

  /**
   * 页面的初始数据
   */
  data: {
    bannerList:[],//轮播图数据
    recommendList:[],//推荐歌单
    topList:[],//排行榜
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    /*没有封装request请求之前
    // wx.request({
    //   // baseUrl:"http://localhost:3000/",
    //   url: 'http://localhost:3000/banner',
    //   method:'get',
    //   data:{
    //     type:2
    //   },
    //   success:(res)=>{
    //     console.log('请求成功:',res);
    //   },
    //   fail:(err)=>{
    //     console.log('请求失败:',err);
    //   }
     })*/

    /**
      * 1. 使用promise来接收request的数据请求,
      * result接收的就是promise对象
      let result = request({//利用es6的函数形参解构赋值
      url: "http://localhost:3000/banner",
      data: {
        type: 2
      },
      method:'get'
      })
      console.log('结果数据:',result);
      // 使用promise来接收request的数据请求,
      result.then((res)=>{
        console.log('promise结果数据:',res);//promise结果数据: {banners: Array(10), code: 200}
      }).catch(err=>{
        console.log('promise结果数据:',err);
      }) */

    //2.使用async await接收request数据请求
    
    // 请求轮播图数据
    let fn = async()=>{
      //利用es6的函数形参解构赋值
      let bannerResult = await request({ url: "/banner",data: {type: 2},method: 'get'})
      // console.log('async请求到的结果:',result);//async请求到的结果: {banners: Array(10), code: 200}
      this.setData({
        bannerList:bannerResult.banners,
      })

      //请求推荐歌单数据
      let recommendResult = await request({
        url:'/personalized',
        method:"get",
        data:{
          limit:10 /* 出现的条数 */
        }
      })
      this.setData({
        recommendList :recommendResult.result,
      })

      //请求排行榜数据
      /**
       * 需求分析:
       *  1.需要根据idx的值,获取对应的数据
       *  2.idx的取值范围是0~20,我们需要0-4
       *  3.需要发送5次请求
       * 前++和后++的区别
       *  1.先看到的是运算符还是值
       *  2.如果先看到的是运算符就先运算后赋值
       *  3.如果先看到的是值就先赋值后运算
       * 
       */                         
      let index = 0;
      let resultArr=[];
      while(index<5){        
        let topListResult = await request({
          url:"/top/list",
          method:"get",
          data:{          //网易云app,只有5个分类,所以取0-4的下标就可以
            idx:index++, //idx是排行榜的的分类,每个分类中的歌曲是不一样的
          }
        })
        let topListItem={
          name:topListResult.playlist.name,
          //splice()会修改原数组      slice()不会修改原数组,包含起始位置,不包含结束位置
          tracks:topListResult.playlist.tracks.slice(0,3)
        }
        // console.log(topListResult.playlist.name);
        //   console.log(topListResult.playlist.tracks.slice(0,3));//每次请求到100条数据,但是只展示3条,所以截取一下
        resultArr.push(topListItem);
        // console.log(resultArr);
        //不需要等待5条内容加载完,用户体验较好,但是渲染次数会多一些(渲染五次,底下只渲染一次)
        this.setData({
          topList:resultArr,
        })
      }
      ////更新topList的状态值,放在此处更新会导致发送请求的过程中页面长时间白屏,用户体验差
      // this.setData({ //5条内容都循环完,才可以接收到,在此期间用户白屏
      //   topList:resultArr,
      // })

      
    }
    fn();

    /* 
      //失败的例子:
        原因:因为setData是wx的方法,而不是fn的方法,如果要想成功需要使用箭头函数,让this指向wx
      async function fn(){
        //利用es6的函数形参解构赋值
        let result = await request({ url: "/banner",data: {type: 2},method: 'get'})
        console.log('async请求到的结果:',result);
        this.setData({//这样不行,因为setData是wx的方法,而不是fn的方法,如果要想成功需要使用箭头函数,让this指向wx
          bannerList:result,
        })
      }
    fn();
    */

  },

  //跳转到每日推荐
  toRecommendSong(){
    wx.navigateTo({
      url: '/packageSong/pages/recommendSong/recommendSong',
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

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})