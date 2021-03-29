import request from '../../utils/request'
let startY = 0; //手指起始的坐标
let moveY = 0; //手指移动的坐标
let moveDistance = 0; //手指移动的距离(开始-移动到的位置=结束的位置)
let _this = ''; //存储this
// pages/personal/personal.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    coverTransform: "translateY(0rpx)", //往下移动
    coverTransition: "", //动画
    userInfo: {}, //用户信息
    recentPlayList: [], //用户播放记录
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    //读取本地存储的用户基本信息
    let userInfo = wx.getStorageSync('userInfo');
    // console.log("userInfo:",userInfo);//Json格式的数据,通过JSON.parse()转换为对象 
    if (userInfo) {
      /* 如果本地存储中有内容才赋值状态 */
      this.setData({
          userInfo: JSON.parse(userInfo) //不进行判断会报错,Unexpected end of JSON input
        }),
        getUserRecentPlayList(this.data.userInfo.userId)
      //获取用户播放记录
    }
    _this = this;
    // request获取最近播放数据
    async function getUserRecentPlayList(userId) {
      let result = await request({
        url: "/user/record",
        method: "get",
        data: {
          uid: userId,
          type: 0 //type=1 时只返回一周的最近播放数据,为0时返回所有播放数据(有100条)
        },
      })
      // console.log(result.allData.length);
      let index = 0;
      let newArry = result.allData.slice(0,10).map((item) => {
        item.id = index++;
        return item;
      })
      // console.log(_this);
      _this.setData({
        recentPlayList: newArry,
      })
      // console.log(result);//{allData: Array(100), code: 200}
    }



  },
  handleTouchStart(event) {
    this.setData({
      coverTransition: "", //手指触摸的时候就清除动画,如果不清除出发过一次动画,第二次下拉也会有动画,因为下拉的值已经赋上去了,所以这里要手动清除一下
    })
    // console.log(event);
    // console.log(event.touches[0].clientY); //touches是一个数组,数组里的元素就是检测到的手指头,最开始接触到屏幕的是下标0
    startY = event.touches[0].clientY //手指开始接触到的屏幕坐标
    console.log('开始', startY);
  },
  handleTouchMove(event) {
    // console.log(event);
    moveY = event.touches[0].clientY //手指移动的坐标
    console.log('移动', moveY);
    moveDistance = moveY - startY; //移动的位置减去开始的位置,就是中间移动了多少的距离
    // console.log('从开始到结束移动了:',moveDistance);//往上移动是负数,往下是正数
    if (moveDistance <= 0) { //不能往上移动
      return; //moveDistance小于0直接return,不执行下面代码
    }
    if (moveDistance >= 80) { //最多往下移动80rpx
      moveDistance = 80;
    }
    this.setData({
      coverTransform: `translateY(${moveDistance}rpx)`
    })
  },
  handleTouchEnd() {
    console.log('结束');
    this.setData({
      coverTransform: `translateY(${0}rpx)`, //手指结束,位置归0
      coverTransition: ".5s linear"
    })
  },

  //点击头像区域,跳转到登录页
  toLogin() {
    wx.navigateTo({
      url: '/pages/login/login',
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