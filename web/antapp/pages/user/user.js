if (typeof wx === 'undefined') var wx = getApp().hj;
// user.js
var api = require('../../api.js');
var app = getApp();
Page({

    /**
     * 页面的初始数据
     */
    data: {
        contact_tel: "",
        show_customer_service: 0,
        //user_center_bg: "/images/img-user-bg.png",
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        app.pageOnLoad(this, options);
    },

    loadData: function (options) {
        var page = this;
        page.setData({
            store: wx.getStorageSync('store'),
        });
        app.request({
            url: api.user.index,
            success: function (res) {
                if (res.code == 0) {
                    if(page.data.__platform=='my'){
                        var menus = res.data.menus;
                        menus.forEach(function(item,index,array){
                            if(item.id==='bangding'){
                                res.data.menus.splice(index,1,0);
                            }
                        });
                    }
                    page.setData(res.data);
                    wx.setStorageSync('pages_user_user', res.data);
                    wx.setStorageSync("share_setting", res.data.share_setting);
                    wx.setStorageSync("user_info", res.data.user_info);
                }
            }
        });
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
        app.pageOnShow(this);
        var page = this;
        page.loadData();
    },

    callTel: function (e) {
        var tel = e.currentTarget.dataset.tel;
        wx.makePhoneCall({
            phoneNumber: tel, //仅为示例，并非真实的电话号码
        });
    },
    apply: function (e) {
        var page = this;
        var share_setting = wx.getStorageSync("share_setting");
        var user_info = wx.getStorageSync("user_info");
        if (share_setting.share_condition == 1) {
            wx.navigateTo({
                url: '/pages/add-share/index',
            })
        } else if (share_setting.share_condition == 0 || share_setting.share_condition == 2) {
            if (user_info.is_distributor == 0) {
                wx.showModal({
                    title: "申请成为分销商",
                    content: "是否申请？",
                    success: function (r) {
                        if (r.confirm) {
                            wx.showLoading({
                                title: "正在加载",
                                mask: true,
                            });
                            app.request({
                                url: api.share.join,
                                method: "POST",
                                data: {
                                    form_id: e.detail.formId
                                },
                                success: function (res) {
                                    if (res.code == 0) {
                                        if (share_setting.share_condition == 0) {
                                            user_info.is_distributor = 2;
                                            wx.navigateTo({
                                                url: '/pages/add-share/index',
                                            })
                                        } else {
                                            user_info.is_distributor = 1;
                                            wx.navigateTo({
                                                url: '/pages/share/index',
                                            })
                                        }
                                        wx.setStorageSync("user_info", user_info);
                                    }
                                },
                                complete: function () {
                                    wx.hideLoading();
                                }
                            });
                        }
                    },
                })
            } else {
                wx.navigateTo({
                    url: '/pages/add-share/index',
                })
            }
        }
    },
    verify: function (e) {
        wx.scanCode({
            onlyFromCamera: false,
            success: function (res) {
                wx.navigateTo({
                    url: '/' + res.path,
                })
            }, fail: function (e) {
                wx.showToast({
                    title: '失败'
                });
            }
        });
    },
    member: function () {
        wx.navigateTo({
            url: '/pages/member/member',
        })
    },
    // 跳转积分商城
    integral_mall: function (e) {
        function isInArray(arr, val) {
            var testStr = ',' + arr.join(",") + ",";
            return testStr.indexOf("," + val + ",") != -1;
        }

        var plugin_id = 'integralmall';
        if (app.permission_list && app.permission_list.length && isInArray(app.permission_list, plugin_id)) {
            wx.navigateTo({
                url: '/pages/integral-mall/index/index',
            });
        }
    },
});