import request from '../../utils/request'
/**
 * 登陆流程:
 *  1.收集表单项数据
 *  2.前端验证
 *    - 验证用户信息(账号,密码)是否合法
 *    - 前端验证不通过就提示用户,不需要发请求给后端
 *    - 前端验证通过,发请求(携带账号,密码)给后端
 *  3.后端验证
 *    - 验证用户是否存在(在数据库中)
 *        - 用户不存在直接返回,告诉前端用户不存在
 *        - 用户存在需要验证密码是否正确(和数据库中的密码对比)
 *            - 密码不正确返回给前端,提示密码不正确
 *            - 密码正确返回给前端数据,提示用户登陆成功(会携带用户相关的信息)
 * 
 */
Page({

  /**
   * 页面的初始数据
   */
  data: {
    phone: '', //手机号
    password: "", //用户密码
    
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  //表单项内容发生改变的回调
  handleInput(event) {
    // console.log(event)
    // console.log(event.detail.value);//输入框内容
    // let type = event.target.id;//触发事件的input,用id传值 有俩种:phone||password
    // console.log(type);

    // id和data-的区别,id只能传一个是唯一的,而data-可以传多个 

    // console.log('data-type:',event.target.dataset.type);
    let dataType = event.target.dataset.type //用data-kay=value传值
    this.setData({
      //对象操作属性用[]中括号,括住属性
      // [type]:event.detail.value,
      [dataType]: event.detail.value,
    })
  },

  //登录的回调
  login() {
    //1.收集表单数据
    let {phone,password} = this.data;
    /**
     * 2.手机号验证
     *    - 1.内容为空
     *    - 2.手机号格式不正确
     *    - 3.手机号格式正确,通过验证
     */
    if (!phone) {
      //提示用户
      wx.showToast({
        title: "手机号不能为空!",
        icon: "error"
      })
      return; //wx.showToast是异步的方法,后面要是有代码也没必要执行,所以直接return
    }
    //定义正则表达式,验证手机后是否正确
    let phongReg = /^1(3|4|5|6|7|8|9)\d{9}$/;
    if (!phongReg.test(phone)) { //正则表达式的test()方法,,接受一个字符串作为参数，如果字符串中有符合正则的部分，则返回true,反之则返回false。
      wx.showToast({
        title: "手机号格式错误!",
        icon: "error"
      })
      return;
    }
    //验证密码
    if (!password) {
      wx.showToast({
        title: '密码不能为空!',
        icon: "error"
      })
      return; //不写return的话,wx.showToast()这个是异步代码,直接就执行到下面代码了,执行不到这里了
    }

    //通过验证
    // wx.showToast({
    //   title: '前端验证通过!',
    // })

    //后端验证
    async function fn() {
      let result = await request({
        url: "/login/cellphone",
        method: 'get',
        data: {
          phone,
          password,
          isLogin:'true',
        }
      })
      // console.log(result);
      // console.log('用户信息数据结果:', result);
      if (result.code == 200) {
        //提示用户登陆成功
        wx.showToast({
          title: '登录成功',
          icon: "success"
        })
        //将用户的信息存放到本地存储
        //存放在本地存储中的数据最好是json对象,所以把获取到的数据转换一下
        // console.log(result.profile);js对象
        // console.log(JSON.stringify(result.profile));//用JSON.stringify()转换为josn对象,json对象是字符串
        wx.setStorageSync('userInfo',JSON.stringify(result.profile))

        //自动跳转到个人中心
        wx.reLaunch({
          url: '/pages/personal/personal',
        })
      } else if (result.code == 501) {
        wx.showToast({
          title: '账号不存在',
          icon: "error"
        })
      } else if (result.code == 502) {
        wx.showToast({
          title: '密码错误',
          icon: "error"
        })
      }else{
        wx.showToast({
          title: '登录失败,请重新登录',
          icon: "error"
        })
      }

    }
    fn();
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