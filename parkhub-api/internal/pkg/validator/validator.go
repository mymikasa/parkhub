package validator

import (
	"fmt"
	"regexp"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

var (
	mobileRegex = regexp.MustCompile(`^1[3-9]\d{9}$`)
)

var fieldNames = map[string]string{
	"name":          "名称",
	"address":       "地址",
	"total_spaces":  "总车位数",
	"lot_type":      "停车场类型",
	"status":        "状态",
	"username":      "用户名",
	"password":      "密码",
	"mobile":        "手机号",
	"email":         "邮箱",
	"real_name":     "真实姓名",
	"role":          "角色",
	"tenant_id":     "租户ID",
	"contact_name":  "联系人",
	"contact_phone": "联系电话",
	"gate_name":     "出入口名称",
	"gate_type":     "出入口类型",
}

var errorMessages = map[string]string{
	"required": "不能为空",
	"min":      "长度或值过小",
	"max":      "长度或值过大",
	"email":    "格式不正确",
	"mobile":   "格式不正确",
}

func FormatValidationError(err error) string {
	if err == nil {
		return ""
	}

	errs, ok := err.(validator.ValidationErrors)
	if !ok {
		return err.Error()
	}

	for _, e := range errs {
		fieldName := fieldNames[e.Field()]
		if fieldName == "" {
			fieldName = e.Field()
		}

		msg := errorMessages[e.Tag()]
		if msg == "" {
			msg = fmt.Sprintf("验证失败: %s", e.Tag())
		}

		switch e.Tag() {
		case "min":
			return fmt.Sprintf("%s%s，最小值为%s", fieldName, msg, e.Param())
		case "max":
			return fmt.Sprintf("%s%s，最大值为%s", fieldName, msg, e.Param())
		default:
			return fmt.Sprintf("%s%s", fieldName, msg)
		}
	}

	return "参数验证失败"
}

// MobileValidator validates Chinese mobile phone numbers.
func MobileValidator(fl validator.FieldLevel) bool {
	phone := fl.Field().String()
	return mobileRegex.MatchString(phone)
}

// RegisterMobileValidator registers the custom mobile validator.
func RegisterMobileValidator() {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		_ = v.RegisterValidation("mobile", MobileValidator)
	}
}
