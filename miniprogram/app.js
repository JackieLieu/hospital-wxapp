let loading = null;
App({
  /**
   * 公共数据
   */
  globalData: {
    version: "0.6.5 [Alpha]",
    title: "康达互联网医院",

    // 域名
    ip: "http://107.173.140.29/",
    // 全部部门列表
    dept: [],

    // 接口
    url: {
      // 小程序登录
      login: "login/",
      // 小程序注册
      register: "register/",

      // 获取用户信息
      accountData: "getUserDetail/?token=",
      // 绑定到主系统[第一步]
      existAccount: "bindExistAccount/",
      // 绑定到主系统[第二步]
      finishBind: "finishBind/",

      // 搜索医生
      searchDoctor: "searchDoctor",
      // 获取所有部门列表
      getAllDept: "getAllDept",
      // 获取 专家列表
      getExpertDoc: "getExpertDoc",

      // 医生注册
      doctorRegister: "bindAndRegMainSysAccountDoc/?token=",
      // 用户注册
      userRegister: "bindAndRegMainSysAccountPat/?token=",
      // 注册 [验证 验证码]
      finishBindAndRegMssion: "finishBindAndRegMssion/",

      // 获取 家庭成员列表
      getFamilyList: "getFamilyList?",
      // 添加 家庭成员[发送验证码]
      addFamilyGetCode: "addFamilyUserStep2/",
      // 添加 家庭成员[验证码验证]
      addFamilySendCode: "addFamilyUserStep3/",
      // 删除 家庭成员
      deleteFamilyUser: "deleteFamilyUser/",

      // 添加医生咨询
      addDoctorAsk: "addDoctorAsk?token=",
      // 医生发送聊天：回复
      docAddAnswer: "docAddAnswer?token=",
      // 病人发送聊天：咨询
      patAddAnswer: "patAddAnswer?token=",
      // 获取咨询信息
      getAskDoctorDetail: "getAskDoctorDetail/",
      // 获取未读的聊天信息
      getUnreadQA: "getUnreadQA/",
      // 标记聊天消息未已读
      qaMarkAsRead: "QAMarkAsRead/",
      // 获取历史聊天记录
      getHistoryQA: "getHistoryQA/",
      // 病人账户下的咨询记录
      getDocAskListByPat: "getDocAskListByPat?token=",
      // 医生账户下的咨询记录
      getDocAskListByDoc: "getDocAskListByDoc?token=",
    },
  },

  onLaunch: function() {
    wx.cloud.init();

    // 内测版代码区域 //

    this.globalData.userInfo = wx.getStorageSync('userInfo') || [];
      /////////////////

      // 初始化本地缓存
      !wx.getStorageSync('colling') && wx.setStorage({
        key: 'colling',
        data: {},
      });


    // 获取全部部门列表 [读取本地,超过一小时则重新获取]

      this.request("", "getAllDept", res => {
        // 过期时间 
        wx.setStorage({
          key: 'dept',
          data: {
            data: res.data
          },
        });
        this.globalData.dept = res.data;
      }, 3600);
  },

  /**
   * 请求函数封装：
   * @param {string} data get请求
   *        {object} data post 请求
   * @param {string} api 调用设定好的url接口,如果不存在则会被当成url
   * @param {function} callback 当得到请求内容时的回调
   * @param {string} note 当为post请求时，url需要额外添加的参数
   *        {number} note 缓存过期时间/下次在过期时间内读取直接返回缓存数据
   */
  request: function(data, api, callback, note, colling) {

    let post = (typeof data == "string"),

      url = this.globalData.ip +
      (this.globalData.url[api] ? "api/" + this.globalData.url[api] : api) +
      (post ? data : "") +
      (note && isNaN(note) ? note : "");

    let storage_coll = wx.getStorageSync('colling');

    // 查看是否存在缓存,有则直接返回[GET]
    if (post && note) {
      let storage = wx.getStorageSync(api);

      // 添加缓存识别
      storage.storage = true;
      
      // 存在数据 && url相等 && 数据未过期
      if (storage &&
        storage.url == url &&
        storage.end >= Date.now()
      ) return callback(storage.data);
    } else if (colling) {
      // 非缓存数据 才有冷却
      if (api in storage_coll) {
        if (storage_coll[api] > Date.now()) {
          return callback(storage_coll[api] - Date.now());
        }
      }
    }

    // 设定过久显示互动
    let showToast = false;

    loading = setTimeout(() => {
      wx.showToast({
        title: '加载中...',
        icon: 'loading',
        mask: true,
        duration: 5000
      });
      showToast = true;
    },1000);

    let req = wx.request({
      url,
      method: post ? "GET" : "POST",
      data: post ? false : data,
      success: res => {
        // 是否有计数器 有则 清除
        if (loading) {
          clearTimeout(loading);
          loading = null;

          // 判断是否正在显示图标
          if (showToast) {
            wx.hideToast();
            showToast = false;
          }
        }

        if (res.statusCode == 200 || res.statusCode == 304) {
          callback && (!res.error ? callback(res) : callback(false));

          // 设置了缓存过期时间 [只缓存GET|且正常请求]
          // ps: 过期请求会被直接覆盖
          if (post && !res.error) {
            if (!isNaN(note) && note) {
              res.header && delete res.header;
              wx.setStorage({
                key: api,
                data: {
                  url,
                  end: Date.now() + note * 1000,
                  data: res
                },
              });
            }
            if (colling) {
              storage_coll[api] = Date.now() + colling * 1000;
              wx.setStorage({
                key: 'colling',
                data: storage_coll,
              });
            }
          }
        } else {
          wx.showToast({
            title: `内部服务器出现问题!请稍后再试[ERROR: ${api}]`,
            icon: "none",
            mask: true,
            duration: 2000
          });
        }
      },
      fail: err => {
        console.log('请求调用出错: ', err);
      }
    });
    //console.log("发送请求 <" + (new Date().toTimeString()) + ">: " + url + (post ? data : "") + (note ? note : ""));
  },


  /**
   * 设置顶部封装
   * @param {string/object} data 传入string为单项属性设置 反之 多项设定
   * @param {string} value 单项设定时调用,当包含","文字将会是黑色反之白色[格式 "#ffffff,000"]
   */
  bar: function(json, value) {

    let setBar = (key, val) => {
      key == 'title' ?
        wx.setNavigationBarTitle({
          title: `${this.globalData.title} - ${val}`
        }) :
        wx.setNavigationBarColor({
          frontColor: val.indexOf(',') == -1 ? "#ffffff" : "#000000",
          backgroundColor: val.split(',')[0],
        });
    }

    value ? setBar(json, value) : Object.keys(json).forEach((val, key) =>
      setBar(val, json[val])
    );
  },

});