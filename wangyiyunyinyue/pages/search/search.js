import request from '../../utils/request'
let isSend=false; //函数节流使用
Page({

  /**
   * 页面的初始数据
   */
  data: {
    placeholderContent:"",//刚开始搜索框里的文字
    hotList:[],//热搜榜数据
    searchContent:"",//用户实时输入的搜索框数据
    searchList:[],//用户搜索模糊匹配的数据
    historyList:[],//搜索历史记录
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    //初始化搜索页面数据
    this.getInitData();
    //从本地存储获取本地存储的历史记录
    this.getSearchHistory();
  },
  //从本地存储获取本地存储的历史记录
  getSearchHistory(){
    let historyList = wx.getStorageSync('searchHistory');
    if(historyList){//如果本地存储有值,就赋值到data中
      this.setData({
        historyList,
      })
    }
  },
  //初始化搜索页面数据
  async getInitData(){
    ////获取搜索框数据
    let  placeholderContentDtata= await request({
      url:"/search/default",
      method:"get",
    })
    //获取热搜数据
     let hotListData = await request({
      url:"/search/hot/detail"
    })
    //更新数据
    this.setData({
      placeholderContent:placeholderContentDtata.data.showKeyword,
      hotList:hotListData.data
    })    
  },
  //监听input输入框的回调
  handleInputChange(event){
    // console.log(event.detail.value);/* 实时获取input的value值 */
    //更新searchContent数据
    this.setData({
      searchContent:event.detail.value.trim(),/*字符串中的trim()方法用于删除字符串的头尾空白符，空白符包括：空格、制表符 tab、换行符等其他空白符等。  */
    })

    //函数节流
    //判断,isSend为true,就不执行下面代码,初始值为false,执行到下面代码就成true了,下一次就能请求到了
    if(isSend){
      return;
    }
    isSend=true;
    //获取搜索数据的功能函数
    this.getSearchList();
    setTimeout(()=>{
      isSend=false;/* 300毫秒之后再次变为false,变为false才能请求 */
    },300)
  },

  //获取搜索数据的功能函数
  async getSearchList(){
    if(!this.data.searchContent){//输入框内容为空字符串,不模糊搜索
      return;
    }
    //据用户输入的内容进行模糊匹配搜索
    let {searchContent,historyList}=this.data;
    let searchListData = await request({
      url:"/search",
      method:"get",
      data:{
        keywords:searchContent,
        limit:10,
      }
    })
    this.setData({
      searchList:searchListData.result.songs
    })
    //将搜索的关键字添加到搜索历史记录中
    if(historyList.includes(searchContent)==true){//如果有,把有的元素,排到第一位
      historyList.splice(historyList.indexOf(searchContent),1)//把识别到的元素删除
    }
    //如果historyList里没有输入框的内容,就添加到历史记录中 
    historyList.unshift(searchContent);
    this.setData({
      historyList,
    })
    
    //把本地历史记录存储到本地存储中
    wx.setStorageSync('searchHistory', historyList)
  },

  //清空搜索内容
  clearSearchContent(){
    console.log('清空');
    this.setData({
      searchContent:'',
    })
  },
  //删除历史记录
  deleteSearchHistory(){
    wx.showModal({
      title:"警告⚠",
      content:"确认清空全部历史记录?",
      success:(res)=>{
        // console.log(res);
        if(res.confirm){//confirm为ture删除,为false取消
          //清空本地存储的历史记录
          wx.removeStorageSync('searchHistory')
          //清空data中的历史记录
          this.setData({
            historyList:[],
          })
         }
      }
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