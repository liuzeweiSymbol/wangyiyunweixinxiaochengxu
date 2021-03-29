//引入基础路径(config文件专门配置服务器相关信息)
import config from './config';

//发送ajax请求
/**
 * 1.封装功能函数
 *    1.功能点要明确
 *    2.函数内部应该保留固定的代码(静态的)
 *    3.将动态的数据抽取成形参,由使用者根据自身的情况动态的传入实参
 *    4.一个良好的功能函数应该设置形参默认值(ES6的形参默认值)
 * 2.封装功能组件
 *    1.功能点要明确
 *    2.组件内部保留静态代码
 *    3.将动态的数据抽取成props参数,由使用者根据自身情况以标签属性的形式动态传入props数据
 *    4.一个良好的组件应该设置组件的必要性及数据类型
 *    props:{
 *      msg:{
 *        required: true,
 *        default:默认值,
 *        type:string
 *      }
 *    }
 * 
 */

/**
 * 未封装案例
 * wx.request({
      // baseUrl:"http://localhost:3000/",
      url: 'http://localhost:3000/banner',
      method:'get',
      data:{
        type:2
      },
      success:(res)=>{
        console.log('请求成功:',res);
      },
      fail:(err)=>{
        console.log('请求失败:',err);
      }
    })
 * 
 */

//利用es6的函数形参解构赋值
export default ({url,method = 'get',data = {}} = {}) => {
  //返回一个promise对象
  return new Promise((resolve,reject) => {
    wx.request({
      // url: config.baseUrl+url,//本地路径,内网
      url: config.mobileHost+url,//内网穿透路径,公网
      method, //es6属性名简写,建名和建值一样就可以省略
      data,
      header:{//a如果cookie没有值就赋值空字符串,如果不赋值空字符串的话,就是undefined,用undefined遍历find()会报错
        cookie: wx.getStorageSync('cookies')?wx.getStorageSync('cookies').find(item=>{
          // console.log(item.includes("MUSIC_U"));//true
          return item.includes("MUSIC_U");
        }):"",
      },
      success: (res) => {
        if(data.isLogin){//如果isLogin为true,就是登录请求
          wx.setStorage({//如果是登陆请求,就把cookies存放到本地存储
            key:'cookies', 
            data:res.cookies        
          })
        }
        // console.log('data:',data);
        // console.log(res);//打印的结果:{data: {…}, header: {…}, statusCode: 200, cookies: Array(0), errMsg: "request:ok"}
        resolve(res.data);//promise状态从pending转为fulfilled的时候就执行resolve()方法
        
    
      },
      fail: (err) => {
        // console.log(err);
        reject(err);//promise状态从pending转为rejected状态的时候,就执行reject()方法
      }
    })
  })
}